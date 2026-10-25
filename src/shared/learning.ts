/** Browser-facing Learning data excludes runtime credentials and deployment metadata. */
export interface LearningSpace {
  id: string;
  name: string;
}
export interface WorkspaceLearning {
  containerId: string | null;
  inherited: boolean;
  space: LearningSpace | null;
}
export interface LearningRun {
  id: string;
  status: "queued" | "freezing" | "batching" | "reducing" | "finalizing" | "succeeded" | "failed";
  createdAt: string;
  candidateCount: number | null;
  failureCode: string | null;
}
export interface LearningCandidate {
  id: string;
  title: string;
  description: string;
  reason: string;
  operation: "add" | "update" | "remove";
  status: "pending_review" | "approved" | "rejected";
}
export interface LearningCandidateDetail extends LearningCandidate {
  files: Array<{ path: string; content: string }>;
  supportingInsights: Array<{ id: string; statement: string; impact: string; alias: string }>;
}
export interface LearningEvidence {
  id: string;
  label: string;
  available: boolean;
  unavailable: string | null;
  items: Array<{ label: string; content: string }>;
}
