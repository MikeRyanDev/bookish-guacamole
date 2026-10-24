import { useEffect, useRef, useState } from "react";
import {
  useAgent,
  useCopilotKit,
  useInterrupt,
  useDefaultRenderTool,
  useRenderToolCall,
} from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Square, ChevronRight, Target } from "lucide-react";
import { IconButton } from "./icon-button";
import { ToolCall } from "./tool-call";
import { Permission, approvalToolCallId } from "./tool-approval";
import { PendingStatus } from "./pending-status";
import { TranscriptMessages } from "./transcript-messages";
import { GoalStatus, goalFromState } from "./goal-status";

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
  return isReady ? <ActiveConversation {...props} /> : <PendingStatus>Connecting…</PendingStatus>;
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
  const [goalMode, setGoalMode] = useState(false);
  const goal = goalFromState(agent.state);
  const unfinishedGoal = goal?.status === "active" || goal?.status === "paused";
  const [error, setError] = useState("");
  // Replay uses the SDK's running flag too; it must not lock or dim the workspace.
  const [connecting, setConnecting] = useState(existing);
  const running = agent.isRunning && !connecting;
  const wasRunning = useRef(false);
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
  }, [agent, agent.isRunning, copilotkit, existing, isReady]);
  useEffect(() => {
    onBusyChange(running);
    if (wasRunning.current && !running) {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    }
    wasRunning.current = running;
  }, [running, onBusyChange, queryClient]);
  async function goalCommand(action: "resume" | "stop") {
    if (agent.isRunning || connecting || agent.pendingInterrupts.length) return;
    setError("");
    try {
      await copilotkit.runAgent({ agent, forwardedProps: { starterGoal: { action } } });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Goal action failed. Try again.");
    }
  }
  async function send() {
    if (!draft.trim() || !isReady || agent.isRunning || agent.pendingInterrupts.length) return;
    const content = draft.trim();
    if (
      goalMode &&
      (unfinishedGoal || content.length > 4000 || ["stop", "resume"].includes(content))
    ) {
      setError(
        unfinishedGoal
          ? "Stop the current goal before starting another."
          : "Use a descriptive objective of up to 4,000 characters.",
      );
      return;
    }
    setDraft("");
    setError("");
    connected.current = true;
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: goalMode ? `Goal: ${content}` : content,
    });
    onFirstSend();
    try {
      await copilotkit.runAgent({
        agent,
        ...(goalMode
          ? { forwardedProps: { starterGoal: { action: "start", objective: content } } }
          : {}),
      });
      setGoalMode(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Run failed.");
    }
    input.current?.focus();
  }
  const pendingCallIds = new Set(agent.pendingInterrupts.map(approvalToolCallId));
  return (
    <section className="conversation" aria-label="Coding conversation">
      <TranscriptMessages
        messages={agent.messages}
        pendingIds={pendingCallIds}
        renderCall={({ call, result }) => renderToolCall({ toolCall: call, toolMessage: result })}
        onCopyError={() => setError("Could not copy message.")}
        busy={connecting}
        empty={
          !connecting && (
            <div className="empty">
              <h1>What are we building?</h1>
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
            {connecting && <PendingStatus>Restoring session…</PendingStatus>}
            {permission}
            {error && (
              <div role="alert" className="error-banner">
                {error}
              </div>
            )}
          </>
        }
      />
      {goal && (
        <GoalStatus
          goal={goal}
          running={running}
          disabled={!isReady || connecting}
          pendingApproval={agent.pendingInterrupts.length > 0}
          onResume={() => {
            void goalCommand("resume");
          }}
          onStop={() => {
            if (running) agent.abortRun();
            else void goalCommand("stop");
          }}
        />
      )}
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="message">
          {goalMode ? "Goal objective" : "Message your coding agent"}
        </label>
        <textarea
          id="message"
          ref={input}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            goalMode ? "What should the agent work toward?" : "Ask your agent to build something…"
          }
          rows={3}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        {goalMode && (
          <p className="goal-hint muted">
            Keeps working for up to 20 rounds. Pauses for approvals. Completion checks use
            additional model calls.
          </p>
        )}
        <div className="composer-toolbar">
          <IconButton
            label={goalMode ? "Switch to message" : "Set a goal"}
            aria-pressed={goalMode}
            disabled={unfinishedGoal || running || connecting}
            onClick={() => {
              setGoalMode(!goalMode);
              input.current?.focus();
            }}
          >
            <Target size={16} />
          </IconButton>
          <span className="muted">
            {agent.pendingInterrupts.length
              ? "Approval required"
              : connecting
                ? ""
                : running
                  ? "Working…"
                  : !isReady
                    ? "Connecting…"
                    : "⌘ Enter"}
          </span>
          {running ? (
            <IconButton label="Stop run" onClick={() => agent.abortRun()}>
              <Square size={15} />
            </IconButton>
          ) : (
            <IconButton
              label={goalMode ? "Start goal" : "Send message"}
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
