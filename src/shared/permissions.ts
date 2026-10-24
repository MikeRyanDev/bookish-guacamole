export const approvalModes = ["default", "acceptEdits", "plan", "bypass"] as const;
export type ApprovalMode = (typeof approvalModes)[number];
export interface ApprovalSettings {
  mode: ApprovalMode;
  permissionMode: "acceptEdits" | "bypass";
  planOnly: boolean;
  status: string;
  pending: number;
}
