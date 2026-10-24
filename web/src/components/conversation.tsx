import { useEffect, useRef, useState } from "react";
import {
  useAgent,
  useCopilotKit,
  useInterrupt,
  useDefaultRenderTool,
  useRenderToolCall,
} from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { ToolCall } from "./tool-call";
import { Permission, approvalToolCallId } from "./tool-approval";
import { PendingStatus } from "./pending-status";
import { TranscriptMessages } from "./transcript-messages";
import { goalFromState } from "./goal-status";

import { ConversationComposer } from "./conversation-composer";

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
    setGoalMode(false);
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
      <ConversationComposer
        draft={draft}
        onDraftChange={setDraft}
        goalMode={goalMode}
        onGoalModeChange={setGoalMode}
        input={input}
        goal={goal}
        running={running}
        connecting={connecting}
        ready={isReady}
        pendingApproval={agent.pendingInterrupts.length > 0}
        onSend={() => {
          void send();
        }}
        onStopRun={() => agent.abortRun()}
        onResumeGoal={() => {
          void goalCommand("resume");
        }}
        onStopGoal={() => {
          if (running) agent.abortRun();
          else void goalCommand("stop");
        }}
      />
    </section>
  );
}
