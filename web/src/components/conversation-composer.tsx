import { useId, useLayoutEffect, type RefObject } from "react";
import type { Goal } from "@tanstack/ai-harness/plugins";
import { ArrowUp, Square, Target, MessageSquare } from "lucide-react";
import { IconButton } from "./icon-button";
import { GoalStatus } from "./goal-status";
import { ComposerPopover } from "./composer-popover";

type ComposerProps = {
  draft: string;
  onDraftChange: (draft: string) => void;
  goalMode: boolean;
  onGoalModeChange: (mode: boolean) => void;
  input: RefObject<HTMLTextAreaElement | null>;
  goal: Goal | null;
  running: boolean;
  connecting: boolean;
  ready: boolean;
  pendingApproval: boolean;
  onSend: () => void;
  onStopRun: () => void;
  onResumeGoal: () => void;
  onStopGoal: () => void;
};
/** Owns composer geometry; only draft growth changes its height, never goal state. */
export function ConversationComposer({
  draft,
  onDraftChange,
  goalMode,
  onGoalModeChange,
  input,
  goal,
  running,
  connecting,
  ready,
  pendingApproval,
  onSend,
  onStopRun,
  onResumeGoal,
  onStopGoal,
}: ComposerProps) {
  const id = useId();
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const resize = () => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };
    resize();
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width !== element.clientWidth) {
        width = element.clientWidth;
        resize();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [draft, input]);
  const unfinished = goal?.status === "active" || goal?.status === "paused";
  function changeMode(mode: boolean) {
    onGoalModeChange(mode);
    input.current?.focus();
  }
  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {goalMode ? "Goal objective" : "Message your coding agent"}
      </label>
      <textarea
        id={id}
        ref={input}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={
          goalMode ? "What should the agent work toward?" : "Ask your agent to build something…"
        }
        rows={2}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey) &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            onSend();
          }
        }}
      />
      <div className="composer-toolbar">
        <div className="composer-tools">
          {goal && !goalMode ? (
            <GoalStatus
              goal={goal}
              running={running}
              disabled={!ready || connecting}
              pendingApproval={pendingApproval}
              onResume={onResumeGoal}
              onStop={onStopGoal}
              onNewGoal={() => changeMode(true)}
            />
          ) : (
            <button
              className="composer-control"
              type="button"
              aria-label={goalMode ? "Switch to message" : "Set a goal"}
              aria-pressed={goalMode}
              disabled={unfinished || running || connecting}
              onClick={() => changeMode(!goalMode)}
            >
              {goalMode ? (
                <Target size={15} aria-hidden="true" />
              ) : (
                <MessageSquare size={15} aria-hidden="true" />
              )}
              {goalMode ? "Goal" : "Message"}
            </button>
          )}
          {goalMode && (
            <ComposerPopover title="How goals work" label="20 rounds">
              <p>
                Keeps working for up to 20 rounds. Pauses for approvals. Completion checks use
                additional model calls.
              </p>
            </ComposerPopover>
          )}
        </div>
        <span
          className={`composer-state muted ${!pendingApproval && !connecting && !running && ready ? "composer-shortcut" : ""}`}
        >
          {pendingApproval
            ? goal && !goalMode
              ? ""
              : "Approval required"
            : connecting
              ? "Restoring…"
              : running
                ? goal
                  ? ""
                  : "Working…"
                : !ready
                  ? "Connecting…"
                  : "⌘ Enter"}
        </span>
        {running ? (
          <IconButton label="Stop run" onClick={onStopRun}>
            <Square size={15} />
          </IconButton>
        ) : (
          <IconButton
            label={goalMode ? "Start goal" : "Send message"}
            className="primary"
            disabled={!draft.trim() || !ready || connecting || pendingApproval}
            onClick={onSend}
          >
            <ArrowUp size={17} />
          </IconButton>
        )}
      </div>
    </form>
  );
}
