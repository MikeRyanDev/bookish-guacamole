import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Copy, Download, Hash, Search, WrapText, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconButton } from "./icon-button";
import { useSyntax } from "../viewers/use-syntax";
import HtmlViewer from "../viewers/html-viewer";

/** Displays bounded, read-only text. Copy/download always use the unmodified response. */
export function FileViewer({ path, content }: { path: string; content: string }) {
  const syntax = useSyntax(path, content);
  const [wrap, setWrap] = useState(false);
  const [mode, setMode] = useState<"source" | "preview">("source");
  const [finding, setFinding] = useState(false);
  const [needle, setNeedle] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [lineInput, setLineInput] = useState("");
  const [going, setGoing] = useState(false);
  const [feedback, setFeedback] = useState<{ content: string; text: string; error?: boolean }>();
  const scroll = useRef<HTMLDivElement>(null);
  const findInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    scroll.current?.focus();
  }, []);
  const lines = useMemo(() => (content ? content.replace(/\n$/, "").split("\n") : []), [content]);
  const { matches, matchesByLine } = useMemo(() => {
    const matches: { line: number; start: number; end: number; index: number }[] = [];
    const matchesByLine = new Map<number, typeof matches>();
    if (needle) {
      const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(pattern)) {
          const hit = {
            line: index,
            start: match.index,
            end: match.index + match[0].length,
            index: matches.length,
          };
          matches.push(hit);
          const hits = matchesByLine.get(index) ?? [];
          hits.push(hit);
          matchesByLine.set(index, hits);
        }
      });
    }
    return { matches, matchesByLine };
  }, [lines, needle]);
  const current = matches.length ? matchIndex % matches.length : 0;
  const activeLine = matches[current]?.line;
  const virtual = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => 22,
    overscan: 12,
  });
  useEffect(() => {
    virtual.measure();
  }, [wrap, content, virtual]);
  useEffect(() => {
    if (activeLine === undefined || mode !== "source") return;
    virtual.scrollToIndex(activeLine, { align: "center" });
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() =>
        scroll.current
          ?.querySelector(".current-match")
          ?.scrollIntoView({ block: "nearest", inline: "nearest" }),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [activeLine, current, needle, mode, virtual]);
  useEffect(() => {
    if (finding) findInput.current?.focus();
  }, [finding]);
  const html = /\.(html?|xhtml)$/i.test(path);
  const markdown = /\.(md|markdown|mdx)$/i.test(path);
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ content, text: `${label} copied.` });
    } catch {
      setFeedback({
        content,
        text: "Copy failed. Select the text and copy it manually.",
        error: true,
      });
    }
  }
  function nextMatch(direction: number) {
    setMatchIndex(matches.length ? (current + direction + matches.length) % matches.length : 0);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = path.split("/").pop() || "file.txt";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div
      className="file-reader"
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "f") {
          event.preventDefault();
          setMode("source");
          setFinding(true);
          findInput.current?.focus();
        }
        if (event.key === "Escape") {
          setFinding(false);
          setGoing(false);
          scroll.current?.focus();
        }
      }}
    >
      <div className="reader-toolbar">
        {(markdown || html) && (
          <div className="reader-modes" aria-label="File view">
            <button aria-pressed={mode === "source"} onClick={() => setMode("source")}>
              Source
            </button>
            <button
              aria-pressed={mode === "preview"}
              onClick={() => {
                setMode("preview");
                setFinding(false);
                setGoing(false);
              }}
            >
              Preview
            </button>
          </div>
        )}
        <div className="reader-actions">
          <IconButton
            label="Find in file"
            aria-pressed={finding}
            onClick={() => {
              setMode("source");
              setFinding(!finding);
            }}
          >
            <Search size={15} />
          </IconButton>
          <IconButton
            label="Go to line"
            aria-pressed={going}
            onClick={() => {
              setMode("source");
              setGoing(!going);
            }}
          >
            <Hash size={15} />
          </IconButton>
          <IconButton
            label="Wrap lines"
            aria-pressed={wrap}
            disabled={mode !== "source"}
            onClick={() => setWrap(!wrap)}
          >
            <WrapText size={15} />
          </IconButton>
          <IconButton label="Copy file contents" onClick={() => void copy(content, "Contents")}>
            <Copy size={15} />
          </IconButton>
          <IconButton label="Download file" onClick={download}>
            <Download size={15} />
          </IconButton>
        </div>
      </div>
      {finding && (
        <div className="reader-find">
          <input
            ref={findInput}
            aria-label="Find in file"
            placeholder="Find in file…"
            value={needle}
            onChange={(event) => {
              setNeedle(event.target.value);
              setMatchIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") nextMatch(event.shiftKey ? -1 : 1);
            }}
          />
          <span role="status">
            {needle
              ? matches.length
                ? `${current + 1} of ${matches.length}`
                : "No matches"
              : "Find text"}
          </span>
          <IconButton
            label="Previous match"
            disabled={!matches.length}
            onClick={() => nextMatch(-1)}
          >
            <ArrowUp size={14} />
          </IconButton>
          <IconButton label="Next match" disabled={!matches.length} onClick={() => nextMatch(1)}>
            <ArrowDown size={14} />
          </IconButton>
          <IconButton
            label="Close find"
            onClick={() => {
              setFinding(false);
              scroll.current?.focus();
            }}
          >
            <X size={14} />
          </IconButton>
        </div>
      )}
      {going && (
        <form
          className="reader-find"
          onSubmit={(event) => {
            event.preventDefault();
            const line = Number(lineInput);
            if (Number.isInteger(line) && line >= 1 && line <= lines.length) {
              virtual.scrollToIndex(line - 1, { align: "start" });
              scroll.current?.focus();
            }
          }}
        >
          <input
            aria-label="Line number"
            type="number"
            min={1}
            max={lines.length}
            required
            placeholder={`Line 1–${lines.length}`}
            value={lineInput}
            onChange={(event) => setLineInput(event.target.value)}
          />
          <button type="submit" disabled={!lines.length}>
            Go
          </button>
          <IconButton label="Close go to line" onClick={() => setGoing(false)}>
            <X size={14} />
          </IconButton>
        </form>
      )}
      {feedback?.content === content && (
        <p className="reader-feedback" role={feedback.error ? "alert" : "status"}>
          {feedback.text}
        </p>
      )}
      {mode === "preview" && html ? (
        <HtmlViewer content={content} />
      ) : mode === "preview" ? (
        <div
          className="file-markdown markdown"
          role="region"
          aria-label="File contents"
          tabIndex={0}
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
              img: ({ alt }) => <span className="muted">[Image: {alt || "not loaded"}]</span>,
              a: ({ href, children }) =>
                /^https?:\/\//i.test(href ?? "") ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ) : (
                  <span>{children}</span>
                ),
            }}
          >
            {content}
          </Markdown>
        </div>
      ) : (
        <div
          ref={scroll}
          className={`file-source ${wrap ? "wrap-source" : ""}`}
          role="region"
          aria-label="File contents"
          tabIndex={0}
        >
          {!content ? (
            <p className="reader-empty">This file is empty.</p>
          ) : (
            <div className="source-lines" style={{ height: virtual.getTotalSize() }}>
              {virtual.getVirtualItems().map((row) => {
                const text = lines[row.index] ?? "";
                const hits = finding ? (matchesByLine.get(row.index) ?? []) : [];
                let cursor = 0;
                const segments = hits.flatMap((match) => {
                  const previous = text.slice(cursor, match.start);
                  cursor = match.end;
                  return [
                    previous,
                    <mark
                      key={match.start}
                      className={match.index === current ? "current-match" : ""}
                    >
                      {text.slice(match.start, match.end)}
                    </mark>,
                  ];
                });
                return (
                  <div
                    key={row.key}
                    data-index={row.index}
                    ref={virtual.measureElement}
                    className="source-line"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <span className="line-number" aria-hidden="true">
                      {row.index + 1}
                    </span>
                    <code>
                      {!hits.length && syntax?.[row.index]?.length ? (
                        syntax[row.index]!.map((token, index) => (
                          <span
                            className="source-token"
                            key={index}
                            style={
                              {
                                "--token-light": token.light,
                                "--token-dark": token.dark,
                              } as CSSProperties
                            }
                          >
                            {token.content}
                          </span>
                        ))
                      ) : (
                        <>
                          {segments}
                          {text.slice(cursor) || (text ? "" : "\n")}
                        </>
                      )}
                    </code>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <footer className="reader-footer">
        <span>
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
        <span>{new TextEncoder().encode(content).length.toLocaleString()} bytes</span>
        <span>Read-only</span>
      </footer>
    </div>
  );
}
