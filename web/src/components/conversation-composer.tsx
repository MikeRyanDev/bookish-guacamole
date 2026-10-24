import { useId, useLayoutEffect, type ReactNode, type RefObject } from "react";
import type { Goal } from "@tanstack/ai-harness/plugins";
import { ArrowUp, Square, Target } from "lucide-react";
import { IconButton } from "./icon-button";
import { GoalStatus } from "./goal-status";

type ComposerProps = {
  approvals?: ReactNode;
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
/** Owns composer geometry; draft growth and explicit goal creation change its height, never persisted goal state. */
export function ConversationComposer({
  approvals,
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
        input.current?.focus();
      }}
    >
      {goalMode && (
        <div className="goal-create-heading">
          <span>New goal</span>
          <button type="button" onClick={() => changeMode(false)}>
            Cancel
          </button>
        </div>
      )}
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
        aria-describedby={goalMode ? `${id}-help` : undefined}
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
      {goalMode && (
        <p className="goal-create-help muted" id={`${id}-help`}>
          Continues automatically for up to 20 agent turns, with an extra model call after each turn
          to check completion. Pauses for approvals.
        </p>
      )}
      {approvals}
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
          ) : !goalMode ? (
            <button
              className="composer-control"
              type="button"
              disabled={unfinished || running || connecting || !ready || pendingApproval}
              onClick={() => changeMode(true)}
            >
              <Target size={15} aria-hidden="true" />
              Create goal
            </button>
          ) : null}
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
        ) : goalMode ? (
          <button
            type="submit"
            className="primary goal-start"
            disabled={!draft.trim() || !ready || connecting || pendingApproval}
          >
            Start goal
          </button>
        ) : (
          <IconButton
            label="Send message"
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
