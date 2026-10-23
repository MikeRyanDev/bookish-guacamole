import { Fragment, useEffect, useRef, useState } from "react";
import {
  useAgent,
  useCopilotKit,
  useInterrupt,
  useDefaultRenderTool,
  useRenderToolCall,
  contentToText,
} from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Square, Terminal, Copy, ChevronRight } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconButton } from "./icon-button";
import { ToolCall } from "./tool-call";
import { Permission } from "./tool-approval";
import { VirtualTranscript } from "./virtual-transcript";

type ConversationProps = {
  threadId: string;
  runtimeAgentId: string;
  existing: boolean;
  onFirstSend: () => void;
  onBusyChange: (busy: boolean) => void;
};
/** Registers the private agent before interrupt hooks try to resolve it. */
export function Conversation(props: ConversationProps) {
  const { isReady } = useAgent({
    agentId: `${props.runtimeAgentId}-${props.threadId}`,
    runtimeAgentId: props.runtimeAgentId,
    threadId: props.threadId,
  });
  return isReady ? <ActiveConversation {...props} /> : <p role="status">Connecting…</p>;
}
/** Renders the SDK transcript without a second message store. */
function ActiveConversation({
  threadId,
  runtimeAgentId,
  existing,
  onFirstSend,
  onBusyChange,
}: ConversationProps) {
  const agentId = `${runtimeAgentId}-${threadId}`;
  const { agent, isReady } = useAgent({ agentId });
  const { copilotkit } = useCopilotKit();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const connected = useRef(false);
  const renderToolCall = useRenderToolCall();
  useDefaultRenderTool(
    {
      render: ({ name, parameters, result, status }) => (
        <ToolCall
          name={name}
          args={JSON.stringify(parameters, null, 2)}
          result={result}
          running={status !== "complete" && agent.isRunning}
        />
      ),
    },
    [],
  );
  const permission = useInterrupt({
    agentId,
    renderInChat: false,
    render: (props) => (
      <Permission key={props.interrupt?.id} {...props} messages={agent.messages} />
    ),
  });
  useEffect(() => {
    if (!existing || !isReady || connected.current || agent.isRunning) return;
    connected.current = true;
    setConnecting(true);
    copilotkit
      .connectAgent({ agent })
      .catch(() => {
        setError("Could not restore this session. Reload to retry.");
      })
      .finally(() => setConnecting(false));
  }, [agent, copilotkit, existing, isReady]);
  useEffect(() => {
    onBusyChange(agent.isRunning);
    if (!agent.isRunning) {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    }
  }, [agent.isRunning, onBusyChange, queryClient]);
  async function send() {
    if (!draft.trim() || !isReady || agent.isRunning || agent.pendingInterrupts.length) return;
    const content = draft.trim();
    setDraft("");
    setError("");
    connected.current = true;
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    onFirstSend();
    try {
      await copilotkit.runAgent({ agent });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Run failed.");
    }
    input.current?.focus();
  }
  const results = new Map(
    agent.messages
      .filter((message) => message.role === "tool")
      .map((message) => [message.toolCallId, message]),
  );
  return (
    <section className="conversation" aria-label="Coding conversation">
      <VirtualTranscript
        items={agent.messages.filter(
          (message) => message.role === "user" || message.role === "assistant",
        )}
        busy={connecting}
        empty={
          !connecting && (
            <div className="empty">
              <div className="empty-mark">
                <Terminal size={25} />
              </div>
              <h1>What are we building?</h1>
              <p>A workspace for your coding agent.</p>
              <button
                className="suggestion"
                onClick={() => {
                  setDraft("Read the project instructions and explain the current code and tests.");
                  input.current?.focus();
                }}
              >
                Explore this project <ChevronRight size={14} />
              </button>
            </div>
          )
        }
        footer={
          <>
            {connecting && (
              <p role="status" className="muted">
                Restoring session…
              </p>
            )}
            {permission}
            {error && (
              <div role="alert" className="error-banner">
                {error}
              </div>
            )}
          </>
        }
        renderItem={(message) => {
          const text = contentToText(message.content);
          return (
            <article
              className={`message ${message.role}`}
              key={message.id}
              aria-label={message.role === "user" ? "Your message" : "Agent response"}
            >
              <div className="message-label">
                {message.role === "user" ? "You" : "Agent"}
                {text && (
                  <IconButton
                    label="Copy message"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(text)
                        .catch(() => setError("Could not copy message."));
                    }}
                  >
                    <Copy size={13} />
                  </IconButton>
                )}
              </div>
              {text && (
                <div className="markdown">
                  <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
                </div>
              )}
              {message.role === "assistant" &&
                message.toolCalls?.map((call) => (
                  <Fragment key={call.id}>
                    {renderToolCall({ toolCall: call, toolMessage: results.get(call.id) })}
                  </Fragment>
                ))}
            </article>
          );
        }}
      />
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="message">
          Message your coding agent
        </label>
        <textarea
          id="message"
          ref={input}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask your agent to build something…"
          rows={3}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        <div className="composer-toolbar">
          <span className="muted">
            {agent.pendingInterrupts.length
              ? "Approval required"
              : agent.isRunning
                ? "Working…"
                : !isReady
                  ? "Connecting…"
                  : "⌘ Enter"}
          </span>
          {agent.isRunning ? (
            <IconButton label="Stop run" onClick={() => agent.abortRun()}>
              <Square size={15} />
            </IconButton>
          ) : (
            <IconButton
              label="Send message"
              className="primary"
              disabled={
                !draft.trim() || !isReady || connecting || agent.pendingInterrupts.length > 0
              }
              onClick={() => {
                send();
              }}
            >
              <ArrowUp size={17} />
            </IconButton>
          )}
        </div>
      </form>
    </section>
  );
}
