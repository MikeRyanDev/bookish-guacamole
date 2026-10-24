import { parseOffice } from "./office-parser";
self.onmessage = (
  event: MessageEvent<{ bytes: ArrayBuffer; kind: "document" | "spreadsheet" | "presentation" }>,
) => {
  try {
    self.postMessage({ document: parseOffice(new Uint8Array(event.data.bytes), event.data.kind) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Unable to parse this document.",
    });
  }
};
