import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import learningStyles from "../styles/learning.module.css";
import sharedStyles from "../styles/shared.module.css";

/** Moves keyboard focus into each newly selected document without scrolling the dialog. */
export function ReaderHeading({ title, back }: { title: string; back: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className={learningStyles.learningReaderHeading}>
      <button className={learningStyles.learningBack} onClick={back}>
        <ArrowLeft size={15} />
        Back to skills
      </button>
      <h2 ref={heading} tabIndex={-1}>
        {title}
      </h2>
    </header>
  );
}
/** Renders complete Skill source, keeping YAML metadata inspectable without treating it as a heading. */
export function SkillMarkdown({ content }: { content: string }) {
  const metadata = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return (
    <>
      <div className={sharedStyles.markdown}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{ h1: "h3", h2: "h4", h3: "h5", h4: "h6", h5: "h6" }}
        >
          {metadata ? content.slice(metadata[0].length) : content}
        </Markdown>
      </div>
      {metadata && (
        <details className={learningStyles.learningMetadata}>
          <summary>Skill metadata</summary>
          <pre>{metadata[0]}</pre>
        </details>
      )}
    </>
  );
}
