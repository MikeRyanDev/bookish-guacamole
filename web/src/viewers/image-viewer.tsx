import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCw, Scan } from "lucide-react";
import { IconButton } from "../components/icon-button";
import { useBlobUrl } from "./use-blob-url";

export default function ImageViewer({ blob, path }: { blob: Blob; path: string }) {
  const url = useBlobUrl(blob);
  const [zoom, setZoom] = useState<number>();
  const [rotation, setRotation] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [available, setAvailable] = useState({ width: 1, height: 1 });
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!area.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(area.current);
    return () => observer.disconnect();
  }, []);
  const rotated = rotation % 180 !== 0;
  const width = rotated ? size.height : size.width;
  const height = rotated ? size.width : size.height;
  const scale = zoom
    ? zoom / 100
    : Math.min(1, available.width / (width || 1), available.height / (height || 1));
  const [error, setError] = useState(false);
  return (
    <>
      <div className="reader-toolbar">
        <IconButton
          label="Zoom out"
          disabled={!size.width || scale <= 0.05}
          onClick={() => setZoom(Math.max(5, Math.round(scale * 100) - 25))}
        >
          <Minus size={15} />
        </IconButton>
        <span>{zoom ? `${zoom}%` : "Fit"}</span>
        <IconButton
          label="Zoom in"
          disabled={!size.width || scale >= 3}
          onClick={() => setZoom(Math.min(300, Math.round(scale * 100) + 25))}
        >
          <Plus size={15} />
        </IconButton>
        <IconButton
          label="Fit image"
          onClick={() => {
            setZoom(undefined);
            setRotation(0);
          }}
        >
          <Scan size={15} />
        </IconButton>
        <IconButton label="Rotate image" onClick={() => setRotation((rotation + 90) % 360)}>
          <RotateCw size={15} />
        </IconButton>
      </div>
      <div
        ref={area}
        className="image-canvas"
        role="region"
        aria-label="Image preview"
        tabIndex={0}
      >
        {error ? (
          <p role="alert">This image could not be decoded. Download it to open in another app.</p>
        ) : (
          url && (
            <div
              className="image-stage"
              style={{ width: width * scale || undefined, height: height * scale || undefined }}
            >
              <img
                src={url}
                alt={path}
                onError={() => setError(true)}
                onLoad={(event) =>
                  setSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  })
                }
                style={{
                  width: size.width ? size.width * scale : undefined,
                  height: size.height ? size.height * scale : undefined,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )
        )}
      </div>
      <div className="reader-footer">{size.width ? `${size.width} × ${size.height}` : ""}</div>
    </>
  );
}
