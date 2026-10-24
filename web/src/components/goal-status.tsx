import type { Goal } from "@tanstack/ai-harness/plugins";
import { Target } from "lucide-react";
import { ComposerPopover } from "./composer-popover";

/** Reads native persisted state without treating arbitrary client state as a goal. */
export function goalFromState(state: unknown): Goal | null {
  if (!state || typeof state !== "object" || !("plugins" in state)) return null;
  const plugins = state.plugins;
  if (!plugins || typeof plugins !== "object" || !("tanstack/goal" in plugins)) return null;
  const value = plugins["tanstack/goal"];
  if (
    !value ||
    typeof value !== "object" ||
    !("text" in value) ||
    typeof value.text !== "string" ||
    !("status" in value) ||
    !["active", "paused", "met", "stopped"].includes(String(value.status)) ||
    !("round" in value) ||
    typeof value.round !== "number" ||
    !("reason" in value) ||
    typeof value.reason !== "string" ||
    !("note" in value) ||
    typeof value.note !== "string" ||
    !("queued" in value) ||
    typeof value.queued !== "string"
  )
    return null;
  return value as Goal;
}

/** Compact native goal state, with details and explicit continuation controls. */
export function GoalStatus({
  goal,
  running,
  disabled,
  pendingApproval = false,
  onResume,
  onStop,
  onNewGoal,
}: {
  goal: Goal;
  running: boolean;
  disabled: boolean;
  pendingApproval?: boolean;
  onResume: () => void;
  onStop: () => void;
  onNewGoal?: () => void;
}) {
  const status =
    goal.status === "met"
      ? "Complete · agent assessed"
      : goal.status === "active"
        ? running
          ? "Working"
          : "Ready to resume"
        : goal.status === "paused"
          ? "Paused"
          : "Stopped";
  return (
    <ComposerPopover
      title="Session goal"
      label={
        <>
          <Target size={15} aria-hidden="true" />
          <span>View goal</span>
          <span className="muted">{pendingApproval ? "Approval required" : status}</span>
        </>
      }
    >
      <div className="goal-status">
        <p className="goal-objective">{goal.text}</p>
        {goal.reason && <p>{goal.reason}</p>}
        <div className="goal-actions">
          {!running && goal.status !== "met" && (
            <button type="button" disabled={disabled || pendingApproval} onClick={onResume}>
              Resume goal
            </button>
          )}
          {(goal.status === "active" || goal.status === "paused") && (
            <button
              type="button"
              disabled={(disabled || pendingApproval) && !running}
              onClick={onStop}
            >
              Stop goal
            </button>
          )}
          {(goal.status === "met" || goal.status === "stopped") && onNewGoal && (
            <button
              type="button"
              disabled={disabled || running || pendingApproval}
              onClick={onNewGoal}
            >
              Create new goal
            </button>
          )}
        </div>
      </div>
    </ComposerPopover>
  );
}
