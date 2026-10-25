/** Connection configuration contains environment variable names, never credential values. */
export interface Connection {
  id: string;
  enabled: boolean;
  transport:
    | { type: "example" }
    | { type: "http"; url: string; auth: "none" | "oauth" | "environment"; tokenVariable?: string }
    | { type: "stdio"; command: string; args: string[]; environment: Record<string, string> };
}

export interface ConnectionsResponse {
  connections: Connection[];
  revision: string | null;
}

export interface ConnectionStatus {
  id: string;
  status:
    | "disabled"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "failed"
    | "sign-in-required"
    | "signed-in";
  toolCount: number;
  error?: string;
}

export interface ConnectionsStatusResponse {
  connections: ConnectionStatus[];
  signIn: {
    connectionId: string;
    status: "starting" | "waiting" | "complete" | "failed";
    url?: string;
    error?: string;
  } | null;
  applying: boolean;
  error: string | null;
}
