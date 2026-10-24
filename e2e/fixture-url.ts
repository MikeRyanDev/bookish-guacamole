/** Allows a worktree's tests to target its own fixture server without sharing another checkout. */
export const fixtureUrl = process.env.FILE_VIEWER_FIXTURE_URL ?? "http://127.0.0.1:4174";
