import sharedStyles from "../styles/shared.module.css";
import transcriptStyles from "../styles/transcript.module.css";
import { type ReactNode, useId } from "react";
import { Copy, ChevronRight, Layers } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@copilotkit/react-core/v2";
import { IconButton } from "./icon-button";
import { VirtualTranscript } from "./virtual-transcript";
import { activitySummary, transcriptRows, type TranscriptCall } from "./transcript-rows";
import {
  ToolDisclosureProvider,
  ToolDisclosureScope,
  useToolDisclosure,
  revealToolContent,
} from "./tool-disclosure";

function ActivityGroup({
  calls,
  renderCall,
}: {
  calls: TranscriptCall[];
  renderCall: (entry: TranscriptCall) => ReactNode;
}) {
  const [open, setOpen] = useToolDisclosure(false, `group:${calls[0]!.call.id}`);
  const bodyId = useId();
  return (
    <section className={transcriptStyles.toolActivity} aria-label="Completed tool activity">
      <button
        className={transcriptStyles.activitySummary}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={(event) => {
          if (!open)
            revealToolContent(
              event.currentTarget.parentElement,
              `.${transcriptStyles.activityCalls}`,
            );
          setOpen(!open);
        }}
      >
        <ChevronRight size={14} className={sharedStyles.toolChevron} aria-hidden="true" />
        <Layers size={14} aria-hidden="true" />
        <span className={transcriptStyles.activityCount}>{calls.length} tool calls</span>
        <span className={transcriptStyles.activityTypes}>{activitySummary(calls)}</span>
      </button>
      <div id={bodyId} hidden={!open} className={transcriptStyles.activityCalls}>
        {open &&
          calls.map((entry) => (
            <ToolDisclosureScope key={entry.call.id} id={entry.call.id}>
              {renderCall(entry)}
            </ToolDisclosureScope>
          ))}
      </div>
    </section>
  );
}

/** Renders a derived, virtualized view; messages and results remain owned by CopilotKit. */
export function TranscriptMessages({
  messages,
  pendingIds,
  renderCall,
  onCopyError,
  ...rest
}: {
  messages: readonly Message[];
  pendingIds: ReadonlySet<string | undefined>;
  renderCall: (entry: TranscriptCall) => ReactNode;
  onCopyError: () => void;
  footer?: ReactNode;
  empty?: ReactNode;
  busy?: boolean;
}) {
  const rows = transcriptRows(messages, pendingIds);
  return (
    <ToolDisclosureProvider>
      <VirtualTranscript
        {...rest}
        items={rows}
        renderItem={(row) => {
          if (row.kind === "activity" && row.calls.length > 1)
            return <ActivityGroup calls={row.calls} renderCall={renderCall} />;
          if (row.kind !== "text") {
            const entry = row.kind === "call" ? row.entry : row.calls[0]!;
            return (
              <div className={transcriptStyles.activitySingle}>
                <ToolDisclosureScope id={entry.call.id}>{renderCall(entry)}</ToolDisclosureScope>
              </div>
            );
          }
          return (
            <article
              className={`${transcriptStyles.message} ${row.role === "user" ? transcriptStyles.user : ""}`}
              aria-label={row.role === "user" ? "Your message" : "Agent response"}
            >
              <div className={sharedStyles.markdown}>
                <Markdown remarkPlugins={[remarkGfm]}>{row.text}</Markdown>
              </div>
              <div className={transcriptStyles.messageActions}>
                <IconButton
                  label="Copy message"
                  onClick={() => navigator.clipboard.writeText(row.text).catch(onCopyError)}
                >
                  <Copy size={13} />
                </IconButton>
              </div>
            </article>
          );
        }}
      />
    </ToolDisclosureProvider>
  );
}
