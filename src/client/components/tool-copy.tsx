import { useState } from "react";
import { IconButton } from "./icon-button";
import { Check, Copy } from "lucide-react";

/** Copies exact evidence and reports clipboard failures locally. */
export function CopyToolText({ text, label }: { text: string; label: string }) {
  const [feedback, setFeedback] = useState<{ text: string; status: "copied" | "error" }>();
  const status = feedback?.text === text ? feedback.status : "idle";
  return (
    <>
      <IconButton
        label={status === "copied" ? "Copied" : label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setFeedback({ text, status: "copied" });
          } catch {
            setFeedback({ text, status: "error" });
          }
        }}
      >
        {status === "copied" ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
      {status === "error" && (
        <span className="tool-copy-error" role="status">
          Copy failed. Select the text to copy it.
        </span>
      )}
    </>
  );
}
