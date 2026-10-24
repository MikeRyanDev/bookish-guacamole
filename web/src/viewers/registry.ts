/** Lightweight dispatch metadata. Renderers and parsers load only after a file is opened. */
export const viewerFormats = [
  {
    kind: "image",
    label: "Image",
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "svg", "ico"],
  },
  { kind: "pdf", label: "PDF", extensions: ["pdf"] },
  { kind: "document", label: "Word document", extensions: ["docx"] },
  { kind: "spreadsheet", label: "Workbook", extensions: ["xlsx"] },
  { kind: "presentation", label: "Presentation", extensions: ["pptx"] },
  {
    kind: "unsupported",
    label: "Download",
    extensions: [
      "doc",
      "xls",
      "ppt",
      "zip",
      "gz",
      "7z",
      "exe",
      "woff",
      "woff2",
      "ttf",
      "mp3",
      "mp4",
      "mov",
      "heic",
      "tiff",
      "tif",
      "docm",
      "xlsm",
      "pptm",
    ],
  },
] as const;
export type AssetKind = (typeof viewerFormats)[number]["kind"];
/** Unknown extensions try bounded UTF-8 text; binary failures retain a download path. */
export function viewerKind(path: string): AssetKind | "text" {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return (
    viewerFormats.find((format) => (format.extensions as readonly string[]).includes(extension))
      ?.kind ?? "text"
  );
}
export const imageMime: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};
