import { useEffect, useState } from "react";

/** Owns revocable object URLs; the bearer remains in the request header, never the URL. */
export function useBlobUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
