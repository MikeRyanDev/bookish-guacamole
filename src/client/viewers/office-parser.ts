import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface OfficeImage {
  bytes: Uint8Array<ArrayBuffer>;
  mime: string;
}
export type DocumentBlock =
  | { kind: "paragraph"; text: string; heading?: number }
  | { kind: "table"; rows: string[][] }
  | { kind: "image"; image: OfficeImage };
export interface SlideElement {
  x: number;
  y: number;
  width: number;
  height: number;
  paragraphs: string[];
  fontSize: number;
  image?: OfficeImage;
}
export interface OfficeSection {
  blocks?: DocumentBlock[];
  slide?: { width: number; height: number; elements: SlideElement[] };
  name: string;
  paragraphs: string[];
  rows?: { number: number; cells: string[] }[];
  truncated: boolean;
}
export interface OfficeDocument {
  sections: OfficeSection[];
  note: string;
}
interface XmlNode {
  name: string;
  attributes: Record<string, unknown>;
  children: XmlNode[];
  value: string;
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function nodes(value: unknown, depth = 0): XmlNode[] {
  if (depth > 40) throw new Error("Document nesting exceeds the preview limit.");
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    Object.entries(record(item))
      .filter(([name]) => name !== ":@")
      .map(([name, content]) => ({
        name: name.split(":").at(-1) ?? name,
        attributes: record(record(item)[":@"]),
        children: nodes(content, depth + 1),
        value: name === "#text" ? String(content ?? "") : "",
      })),
  );
}
function descendants(items: XmlNode[], name: string): XmlNode[] {
  return items.flatMap((item) => (item.name === name ? [item] : descendants(item.children, name)));
}
function text(node: XmlNode): string {
  return node.value + node.children.map(text).join("");
}
function attribute(node: XmlNode, name: string): string {
  return String(
    node.attributes[`r:${name}`] ??
      node.attributes[name] ??
      Object.entries(node.attributes).find(([key]) => key.endsWith(`:${name}`))?.[1] ??
      "",
  );
}
function column(reference: string): number {
  let value = 0;
  for (const letter of reference.replace(/\d/g, "").toUpperCase())
    value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

/** Extracts bounded OOXML content, never formulas, macros, external links, or executable HTML. */
export function parseOffice(
  bytes: Uint8Array,
  kind: "document" | "spreadsheet" | "presentation",
): OfficeDocument {
  let expanded = 0;
  let entries = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      if (++entries > 4000) throw new Error("Archive has too many entries to preview.");
      if (!/\.xml$|\.rels$|\.(png|jpe?g|gif|webp)$/i.test(file.name)) return false;
      expanded += file.originalSize;
      if (file.originalSize > 4 * 1024 * 1024 || expanded > 16 * 1024 * 1024)
        throw new Error("Expanded document exceeds the preview limit.");
      return true;
    },
  });
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: false,
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: true,
  });
  function read(path: string): XmlNode[] {
    const bytes = files[path];
    if (!bytes) throw new Error("This document is missing required content.");
    const source = strFromU8(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("Document entities are not supported.");
    if (XMLValidator.validate(source) !== true)
      throw new Error("This document contains invalid XML.");
    const parsed: unknown = parser.parse(source);
    return nodes(parsed);
  }
  function imageFor(part: string, node: XmlNode): OfficeImage | undefined {
    const embed = descendants(node.children, "blip")[0];
    if (!embed) return;
    const folder = part.slice(0, part.lastIndexOf("/") + 1);
    const relPath = `${folder}_rels/${part.split("/").pop()}.rels`;
    if (!files[relPath]) return;
    const relation = descendants(read(relPath), "Relationship").find(
      (item) => attribute(item, "Id") === attribute(embed, "embed"),
    );
    if (!relation || attribute(relation, "TargetMode") === "External") return;
    const target = attribute(relation, "Target");
    const segments: string[] = [];
    for (const segment of (target.startsWith("/") ? target.slice(1) : folder + target).split("/")) {
      if (segment === "..") {
        if (!segments.length) return;
        segments.pop();
      } else if (segment !== ".") segments.push(segment);
    }
    const path = segments.join("/");
    const bytes = files[path];
    const extension = path.split(".").pop()?.toLowerCase();
    const mime =
      extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension && ["png", "gif", "webp"].includes(extension)
          ? `image/${extension}`
          : undefined;
    return bytes && mime ? { bytes, mime } : undefined;
  }
  if (kind === "document") {
    const paragraphs = descendants(read("word/document.xml"), "p").map((p) =>
      descendants(p.children, "t").map(text).join(""),
    );
    const body = descendants(read("word/document.xml"), "body")[0];
    const blocks: DocumentBlock[] = [];
    for (const node of body?.children.slice(0, 5000) ?? []) {
      if (node.name === "p") {
        const style = descendants(node.children, "pStyle")[0];
        const heading = style
          ? Number(attribute(style, "val").match(/heading([1-6])/i)?.[1]) || undefined
          : undefined;
        blocks.push({
          kind: "paragraph",
          text: descendants(node.children, "t").map(text).join(""),
          heading,
        });
        for (const picture of descendants(node.children, "drawing")) {
          const image = imageFor("word/document.xml", picture);
          if (image) blocks.push({ kind: "image", image });
        }
      } else if (node.name === "tbl") {
        blocks.push({
          kind: "table",
          rows: descendants(node.children, "tr")
            .slice(0, 500)
            .map((row) =>
              descendants(row.children, "tc")
                .slice(0, 100)
                .map((cell) =>
                  descendants(cell.children, "p")
                    .map((p) => descendants(p.children, "t").map(text).join(""))
                    .join("\n"),
                ),
            ),
        });
      }
    }
    return {
      sections: [
        {
          name: "Document",
          blocks,
          paragraphs: paragraphs.slice(0, 5000),
          truncated: paragraphs.length > 5000,
        },
      ],
      note: "Reading preview with headings, tables, and embedded images. Page layout and advanced formatting may differ; download for the original.",
    };
  }
  if (kind === "presentation") {
    let paths = Object.keys(files)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
    if (files["ppt/presentation.xml"] && files["ppt/_rels/presentation.xml.rels"]) {
      const links = descendants(read("ppt/_rels/presentation.xml.rels"), "Relationship");
      const ordered = descendants(read("ppt/presentation.xml"), "sldId").map((slide) => {
        const link = links.find((item) => attribute(item, "Id") === attribute(slide, "id"));
        if (!link || attribute(link, "TargetMode") === "External")
          throw new Error("Invalid slide relationship.");
        const target = attribute(link, "Target");
        return target.startsWith("/") ? target.slice(1) : `ppt/${target}`;
      });
      if (ordered.length) paths = ordered;
    }
    if (!paths.length) throw new Error("No slides found in this presentation.");
    const dimensions = files["ppt/presentation.xml"]
      ? descendants(read("ppt/presentation.xml"), "sldSz")[0]
      : undefined;
    const width = dimensions ? Number(attribute(dimensions, "cx")) || 9144000 : 9144000;
    const height = dimensions ? Number(attribute(dimensions, "cy")) || 5143500 : 5143500;
    const sections = paths.slice(0, 500).map((path, index) => {
      const root = read(path);
      const paragraphs = descendants(root, "p").map((p) =>
        descendants(p.children, "t").map(text).join(""),
      );
      const elements: SlideElement[] = [];
      const shapes = descendants(root, "spTree")[0]?.children ?? [];
      for (const shape of shapes.slice(0, 500)) {
        if (!["sp", "pic"].includes(shape.name)) continue;
        const transform = descendants(shape.children, "xfrm")[0];
        const offset = transform && descendants(transform.children, "off")[0];
        const extent = transform && descendants(transform.children, "ext")[0];
        if (!offset || !extent) continue;
        const run = descendants(shape.children, "rPr")[0];
        elements.push({
          x: Number(attribute(offset, "x")) || 0,
          y: Number(attribute(offset, "y")) || 0,
          width: Number(attribute(extent, "cx")) || width,
          height: Number(attribute(extent, "cy")) || height,
          paragraphs: descendants(shape.children, "p").map((p) =>
            descendants(p.children, "t").map(text).join(""),
          ),
          fontSize: run ? Number(attribute(run, "sz")) / 100 || 24 : 24,
          image: imageFor(path, shape),
        });
      }
      return {
        name: `Slide ${index + 1}`,
        paragraphs,
        slide: elements.length ? { width, height, elements } : undefined,
        truncated: false,
      };
    });
    return {
      sections,
      note: `Slide preview with positioned text and images. Master layouts, charts, and animations may differ.${paths.length > 500 ? " Showing the first 500 slides." : ""} Download to view the original presentation.`,
    };
  }
  const shared = files["xl/sharedStrings.xml"]
    ? descendants(read("xl/sharedStrings.xml"), "si").map((item) =>
        descendants(item.children, "t").map(text).join(""),
      )
    : [];
  const relationships = descendants(read("xl/_rels/workbook.xml.rels"), "Relationship");
  const sheets = descendants(read("xl/workbook.xml"), "sheet");
  const sections = sheets.slice(0, 100).map((sheet) => {
    const relation = relationships.find((item) => attribute(item, "Id") === attribute(sheet, "id"));
    if (!relation || attribute(relation, "TargetMode") === "External")
      throw new Error("External worksheets are not supported.");
    const target = attribute(relation, "Target");
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    if (path.includes("..")) throw new Error("Invalid worksheet path.");
    const sourceRows = descendants(read(path), "row");
    let truncated = sourceRows.length > 5000;
    const rows = sourceRows.slice(0, 5000).map((row, index) => {
      const cells: string[] = [];
      for (const cell of descendants(row.children, "c")) {
        const at = column(attribute(cell, "r"));
        if (at < 0 || at >= 100) {
          truncated = true;
          continue;
        }
        const raw = descendants(cell.children, "v").map(text).join("");
        cells[at] =
          attribute(cell, "t") === "s"
            ? (shared[Number(raw)] ?? "")
            : attribute(cell, "t") === "inlineStr"
              ? descendants(cell.children, "t").map(text).join("")
              : attribute(cell, "t") === "b"
                ? raw === "1"
                  ? "TRUE"
                  : "FALSE"
                : raw;
      }
      return {
        number: Number(attribute(row, "r")) || index + 1,
        cells: Array.from({ length: cells.length }, (_, index) => cells[index] ?? ""),
      };
    });
    return { name: attribute(sheet, "name"), paragraphs: [], rows, truncated };
  });
  if (!sections.length) throw new Error("No worksheets found in this workbook.");
  return {
    sections,
    note: "Values preview. Formulas use saved results; dates and formatted numbers show stored values. Charts and formatting are omitted.",
  };
}
