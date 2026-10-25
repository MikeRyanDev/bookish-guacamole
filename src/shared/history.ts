export interface HistoryActionPreview {
  available: boolean;
  revision: string | null;
  files: string[];
  conflicts: string[];
  reason: string | null;
}

export interface HistoryPreview {
  undo: HistoryActionPreview;
  redo: HistoryActionPreview;
}
