import { expect, test } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { parseOffice } from "../web/src/viewers/office-parser.js";
import { officeFixture } from "./fixtures/office.js";

test("Word preserves paragraph order and XML entities as text", () => {
  expect(
    parseOffice(officeFixture("document"), "document").sections[0]?.paragraphs.slice(0, 2),
  ).toEqual(["Quarterly report & review", "Revenue grew this quarter."]);
});
test("Word exposes headings and tables and slides retain positioned text", () => {
  const word = parseOffice(officeFixture("document"), "document").sections[0]!;
  expect(word.blocks?.[0]).toMatchObject({ kind: "paragraph", heading: 1 });
  expect(word.blocks?.[2]).toEqual({
    kind: "table",
    rows: [
      ["Quarter", "Revenue"],
      ["Q1", "120"],
    ],
  });
  const slide = parseOffice(officeFixture("presentation"), "presentation").sections[0]!;
  expect(slide.slide?.elements[0]).toMatchObject({
    x: 600000,
    y: 700000,
    fontSize: 32,
    paragraphs: ["Project overview"],
  });
});
test("workbooks preserve sheet names, sparse coordinates, shared strings and cached formula results", () => {
  const result = parseOffice(officeFixture("spreadsheet"), "spreadsheet");
  expect(result.sections.map((sheet) => sheet.name)).toEqual(["Revenue", "Costs"]);
  expect(result.sections[0]?.rows?.[1]).toEqual({ number: 2, cells: ["Q1", "120"] });
  expect(result.sections[1]?.rows?.[0]).toEqual({ number: 4, cells: ["", "", "42"] });
});
test("presentations expose ordered slides", () => {
  expect(
    parseOffice(officeFixture("presentation"), "presentation").sections.map(
      (slide) => slide.paragraphs,
    ),
  ).toEqual([["Project overview"], ["Next steps"]]);
});
test("Office parser refuses entity declarations, invalid files, and oversized expansion", () => {
  expect(() => parseOffice(new Uint8Array([1, 2, 3]), "document")).toThrow();
  const entity = zipSync({
    "word/document.xml": strToU8(
      '<!DOCTYPE doc [<!ENTITY external SYSTEM "file:///etc/passwd">]><doc>&external;</doc>',
    ),
  });
  expect(() => parseOffice(entity, "document")).toThrow(/entities/);
  const large = zipSync({ "word/document.xml": strToU8("x".repeat(4 * 1024 * 1024 + 1)) });
  expect(() => parseOffice(large, "document")).toThrow(/limit/);
});
