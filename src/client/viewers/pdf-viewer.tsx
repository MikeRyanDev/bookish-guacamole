import filesStyles from "../styles/files.module.css";
import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, Minus, Plus, Scan } from "lucide-react";
import { IconButton } from "../components/icon-button";
GlobalWorkerOptions.workerSrc = workerUrl;

/** Renders one PDF page at a time and cancels decoding/rendering on navigation. */
export default function PdfViewer({ blob }: { blob: Blob }) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState<number>();
  const [displayedScale, setDisplayedScale] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(300);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!area.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(area.current);
    return () => observer.disconnect();
  }, []);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let task: ReturnType<typeof getDocument> | undefined;
    void blob
      .arrayBuffer()
      .then((data) => {
        if (disposed) return;
        task = getDocument({ data, useSystemFonts: true });
        return task.promise.then((value) => {
          if (!disposed) {
            setDocument(value);
            setPage(1);
          }
        });
      })
      .catch(() => {
        if (!disposed) {
          setError("This PDF could not be opened. It may be encrypted or damaged.");
          setBusy(false);
        }
      });
    return () => {
      disposed = true;
      if (task) void task.destroy().catch(() => {});
    };
  }, [blob]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let disposed = false;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setBusy(true);
    setText("");
    setError("");
    void document
      .getPage(page)
      .then(async (selected) => {
        if (disposed || !canvas.current) return;
        const base = selected.getViewport({ scale: 1 });
        const viewport = selected.getViewport({
          scale: zoom ?? Math.min(1, Math.max(0.01, availableWidth / base.width)),
        });
        const scale = Math.min(
          devicePixelRatio || 1,
          2,
          Math.sqrt(16_000_000 / (viewport.width * viewport.height)),
        );
        canvas.current.width = Math.floor(viewport.width * scale);
        canvas.current.height = Math.floor(viewport.height * scale);
        canvas.current.style.width = `${viewport.width}px`;
        canvas.current.style.height = `${viewport.height}px`;
        render = selected.render({
          canvas: canvas.current,
          viewport,
          transform: [scale, 0, 0, scale, 0, 0],
        });
        await render.promise;
        const content = await selected.getTextContent();
        if (!disposed) {
          setText(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
          setDisplayedScale(viewport.scale);
          setBusy(false);
        }
      })
      .catch((error) => {
        if (!disposed && error?.name !== "RenderingCancelledException") {
          setError("This page could not be rendered. Download the PDF to open it in another app.");
          setBusy(false);
        }
      });
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [document, page, zoom, availableWidth]);
  return (
    <>
      <div className={filesStyles.readerToolbar}>
        <IconButton
          label="Previous page"
          disabled={!document || page === 1}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={15} />
        </IconButton>
        <label className={filesStyles.pagePicker}>
          Page{" "}
          <input
            aria-label="PDF page"
            type="number"
            min={1}
            max={document?.numPages ?? 1}
            value={page}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (document && next >= 1 && next <= document.numPages) setPage(next);
            }}
          />{" "}
          of {document?.numPages ?? "…"}
        </label>
        <IconButton
          label="Next page"
          disabled={!document || page === document.numPages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={15} />
        </IconButton>
        <IconButton
          label="Zoom out"
          disabled={busy || displayedScale <= 0.05}
          onClick={() => setZoom(Math.max(0.05, displayedScale - 0.25))}
        >
          <Minus size={15} />
        </IconButton>
        <span>{zoom ? `${Math.round(zoom * 100)}%` : "Fit"}</span>
        <IconButton
          label="Zoom in"
          disabled={busy || displayedScale >= 2}
          onClick={() => setZoom(Math.min(2, displayedScale + 0.25))}
        >
          <Plus size={15} />
        </IconButton>
        <IconButton label="Fit page width" onClick={() => setZoom(undefined)}>
          <Scan size={15} />
        </IconButton>
      </div>
      {busy && (
        <p role="status" className={filesStyles.readerFeedback}>
          Rendering page…
        </p>
      )}
      {error && (
        <p role="alert" className={filesStyles.readerError}>
          {error}
        </p>
      )}
      <div
        ref={area}
        className={filesStyles.pdfCanvas}
        role="region"
        aria-label="PDF page"
        tabIndex={0}
      >
        <canvas ref={canvas} aria-label={`PDF page ${page}`} />
      </div>
      {text && (
        <details className={filesStyles.pdfText}>
          <summary>Page text</summary>
          <p>{text}</p>
        </details>
      )}
    </>
  );
}
