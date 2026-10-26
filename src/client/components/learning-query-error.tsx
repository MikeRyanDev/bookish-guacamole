import learningStyles from "../styles/learning.module.css";

/** Keeps retry feedback beside the failed query without replacing its parent view. */
export function QueryError({
  error,
  retry,
  pending = false,
}: {
  error: Error;
  retry: () => void;
  pending?: boolean;
}) {
  return (
    <div className={learningStyles.learningError} role="alert">
      <p>{error.message}</p>
      <button type="button" onClick={retry} disabled={pending}>
        {pending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

/** Workspace-scoped settings and actions; confirmed server state stays in Query. */
