import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { OfficeDocument, OfficeSection, OfficeImage, DocumentBlock } from "./office-parser";

function EmbeddedImage({ image }: { image: OfficeImage }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([image.bytes], { type: image.mime }));
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  return url ? <img src={url} alt="Embedded document image" /> : null;
}
function Block({ block }: { block: DocumentBlock }) {
  if (block.kind === "image") return <EmbeddedImage image={block.image} />;
  if (block.kind === "table")
    return (
      <div className="office-table-scroll">
        <table>
          <tbody>
            {block.rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, column) => (
                  <td key={column}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (block.heading)
    return (
      <div role="heading" aria-level={block.heading} className="office-heading">
        {block.text}
      </div>
    );
  return <p>{block.text || "\u00a0"}</p>;
}
function Slide({ section }: { section: OfficeSection }) {
  const slide = section.slide!;
  return (
    <div className="slide-scroll" role="region" aria-label={section.name} tabIndex={0}>
      <div className="slide-frame" style={{ aspectRatio: `${slide.width} / ${slide.height}` }}>
        {slide.elements.map((element, index) => (
          <div
            key={index}
            className="slide-element"
            style={{
              left: `${(element.x / slide.width) * 100}%`,
              top: `${(element.y / slide.height) * 100}%`,
              width: `${(element.width / slide.width) * 100}%`,
              height: `${(element.height / slide.height) * 100}%`,
              fontSize: `${Math.min(12, Math.max(1, ((element.fontSize * 12700) / slide.width) * 100))}cqw`,
            }}
          >
            {element.image ? (
              <EmbeddedImage image={element.image} />
            ) : (
              element.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            )}
          </div>
        ))}
      </div>
      <details className="pdf-text">
        <summary>Slide text</summary>
        {section.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </details>
    </div>
  );
}

function columnName(index: number): string {
  return index < 26
    ? String.fromCharCode(65 + index)
    : String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
}
function Sheet({ section }: { section: OfficeSection }) {
  const scroll = useRef<HTMLDivElement>(null);
  const rows = section.rows ?? [];
  const columns = Math.max(1, ...rows.map((row) => row.cells.length));
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => 32,
    overscan: 8,
  });
  return (
    <div ref={scroll} className="sheet-scroll" role="region" aria-label={section.name} tabIndex={0}>
      <table className="sheet-table" aria-rowcount={rows.length + 1}>
        <thead>
          <tr>
            <th scope="col">Row</th>
            {Array.from({ length: columns }, (_, index) => (
              <th scope="col" key={index}>
                {columnName(index)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr aria-hidden="true">
            <td
              colSpan={columns + 1}
              style={{ height: virtual.getVirtualItems()[0]?.start ?? 0, padding: 0 }}
            />
          </tr>
          {virtual.getVirtualItems().map((item) => (
            <tr key={item.key} aria-rowindex={item.index + 2}>
              <th scope="row">{rows[item.index]?.number}</th>
              {Array.from({ length: columns }, (_, col) => (
                <td key={col} title={rows[item.index]?.cells[col]}>
                  {rows[item.index]?.cells[col]}
                </td>
              ))}
            </tr>
          ))}
          <tr aria-hidden="true">
            <td
              colSpan={columns + 1}
              style={{
                height: virtual.getTotalSize() - (virtual.getVirtualItems().at(-1)?.end ?? 0),
                padding: 0,
              }}
            />
          </tr>
        </tbody>
      </table>
      {!rows.length && <p className="reader-empty">This worksheet is empty.</p>}
    </div>
  );
}
/** Runs bounded archive/XML parsing off the UI thread; a new file terminates the old worker. */
export default function OfficeViewer({
  blob,
  kind,
}: {
  blob: Blob;
  kind: "document" | "spreadsheet" | "presentation";
}) {
  const [result, setResult] = useState<{ blob: Blob; document?: OfficeDocument; error?: string }>();
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const worker = new Worker(new URL("./office.worker.ts", import.meta.url), { type: "module" });
    let disposed = false;
    const timer = setTimeout(() => {
      worker.terminate();
      if (!disposed)
        setResult({
          blob,
          error: "This document took too long to preview. Download it to open in its original app.",
        });
    }, 10000);
    worker.onmessage = (event: MessageEvent<{ document?: OfficeDocument; error?: string }>) => {
      clearTimeout(timer);
      setResult({ blob, ...event.data });
    };
    worker.onerror = () => {
      clearTimeout(timer);
      setResult({ blob, error: "Unable to open this document." });
    };
    void blob
      .arrayBuffer()
      .then((bytes) => {
        if (!disposed) worker.postMessage({ bytes, kind }, [bytes]);
      })
      .catch(() => {
        if (!disposed) setResult({ blob, error: "Unable to read this document." });
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      worker.terminate();
    };
  }, [blob, kind]);
  if (result?.blob !== blob)
    return (
      <p role="status" className="reader-feedback">
        Reading document…
      </p>
    );
  if (result.error)
    return (
      <p role="alert" className="reader-error">
        {result.error}
      </p>
    );
  const document = result.document;
  const section = document?.sections[selected] ?? document?.sections[0];
  if (!document || !section) return <p className="reader-empty">This document is empty.</p>;
  return (
    <>
      {document.sections.length > 1 && (
        <label className="office-section-picker">
          {kind === "spreadsheet" ? "Sheet" : "Slide"}
          <select
            aria-label={kind === "spreadsheet" ? "Sheet" : "Slide"}
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
          >
            {document.sections.map((section, index) => (
              <option key={index} value={index}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="office-note muted">{document.note}</p>
      {section.truncated && (
        <p role="status" className="reader-feedback">
          Preview limited to 5,000 rows or paragraphs and 100 columns. Download for all content.
        </p>
      )}
      {section.slide ? (
        <Slide section={section} />
      ) : section.rows ? (
        <Sheet key={selected} section={section} />
      ) : (
        <article className="office-document" aria-label={section.name} tabIndex={0}>
          {section.blocks?.length ? (
            section.blocks.map((block, index) => <Block key={index} block={block} />)
          ) : section.paragraphs.length ? (
            section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph || "\u00a0"}</p>)
          ) : (
            <p>No text in this {kind === "presentation" ? "slide" : "document"}.</p>
          )}
        </article>
      )}
    </>
  );
}
