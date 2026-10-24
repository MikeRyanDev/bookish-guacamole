export interface AppConfig {
  token: string;
  runtimeUrl: string;
  workspace: string;
  workspaceId: string;
  workspaceName: string;
  agentId: string;
  defaultModel: string;
  models: Array<{ id: string; label: string; provider: string; model: string }>;
  containerId: string;
}
export interface Skill {
  name: string;
  description: string;
  content: string;
}
export interface WorkspaceEntry {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}
