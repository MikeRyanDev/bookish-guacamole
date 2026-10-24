import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useBlobUrl } from "./use-blob-url";
import ImageViewer from "./image-viewer";
import { imageMime, type AssetKind } from "./registry";
const PdfViewer = lazy(() => import("./pdf-viewer"));
const OfficeViewer = lazy(() => import("./office-viewer"));

/** Fetches a bounded local asset with Query cancellation and a short-lived cache. */
export function AssetViewer({
  path,
  workspace,
  token,
  kind,
}: {
  path: string;
  workspace: string;
  token: string;
  kind: AssetKind;
}) {
  const query = useQuery({
    queryKey: ["asset", workspace, path],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/workspace/asset?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(path)}`,
        { signal, headers: { authorization: `Bearer ${token}` } },
      );
      if (!response.ok)
        throw new Error(
          "Unable to load this file. It may have moved, be private, or exceed 20 MiB.",
        );
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 20 * 1024 * 1024)
        throw new Error("File exceeds the 20 MiB viewer limit.");
      return new Blob([bytes], {
        type:
          kind === "image"
            ? imageMime[path.split(".").pop()?.toLowerCase() ?? ""]
            : kind === "pdf"
              ? "application/pdf"
              : "application/octet-stream",
      });
    },
    staleTime: 1000,
    gcTime: 0,
    retry: false,
  });
  const url = useBlobUrl(query.data);
  return (
    <div className="file-reader">
      <div className="reader-toolbar">
        <span className="muted">
          {query.data
            ? `${(query.data.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KiB`
            : ""}
        </span>
        <div className="reader-actions">
          {url && (
            <a className="asset-download" href={url} download={path.split("/").pop()}>
              <Download size={15} />
              Download
            </a>
          )}
        </div>
      </div>
      {query.isFetching && (
        <p role="status" className="reader-feedback">
          Loading file…
        </p>
      )}
      {query.error ? (
        <div role="alert" className="reader-error">
          <p>{query.error.message}</p>
          <button onClick={() => void query.refetch()}>Retry file</button>
        </div>
      ) : (
        query.data && (
          <Suspense
            fallback={
              <p role="status" className="reader-feedback">
                Loading viewer…
              </p>
            }
          >
            {kind === "image" ? (
              <ImageViewer key={query.dataUpdatedAt} blob={query.data} path={path} />
            ) : kind === "pdf" ? (
              <PdfViewer blob={query.data} />
            ) : kind === "unsupported" ? (
              <p className="reader-empty">
                No preview for this format. Download the file to open it in its original app.
              </p>
            ) : (
              <OfficeViewer blob={query.data} kind={kind} />
            )}
          </Suspense>
        )
      )}
    </div>
  );
}
