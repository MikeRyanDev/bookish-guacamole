import appearanceStyles from "../styles/appearance.module.css";
import sharedStyles from "../styles/shared.module.css";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { type Accent } from "../appearance";
import { fromCmyk, fromHsv, parseHex, toCmyk, toHex, toHsv, type Color } from "../colors";
import { IconButton } from "./icon-button";

type Format = "HEX" | "RGBA" | "HSV" | "CMYK";
function savedColors(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("starter-custom-colors") ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(value.filter((c): c is string => typeof c === "string" && !!parseHex(c))),
        ].slice(0, 24)
      : [];
  } catch {
    return [];
  }
}
/** Saved swatches are browser preferences; the editor keeps uncommitted input local. */
export function CustomColors({
  accent,
  onSelect,
}: {
  accent: Accent;
  onSelect: (color: Accent) => void;
}) {
  const [colors, setColors] = useState(savedColors);
  const [editing, setEditing] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const group = useRef<HTMLDivElement>(null);
  function closeEditor() {
    setEditing(false);
    requestAnimationFrame(() => addButton.current?.focus());
  }
  const [storageError, setStorageError] = useState(false);
  function save(next: string[]) {
    setColors(next);
    try {
      localStorage.setItem("starter-custom-colors", JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return (
    <div className={appearanceStyles.customColors} ref={group}>
      {colors.length > 0 && (
        <div className={appearanceStyles.customSwatchList} aria-label="Custom colors">
          {colors.map((color, index) => (
            <div className={appearanceStyles.customSwatchItem} key={color}>
              <button
                className={[appearanceStyles.customSwatch, appearanceStyles.checkerboard].join(" ")}
                aria-label={`Use ${color}`}
                aria-pressed={accent === color}
                onClick={() => onSelect(color as Accent)}
              >
                <span style={{ background: color }}>{accent === color && <Check size={16} />}</span>
              </button>
              <IconButton
                label={`Remove ${color}`}
                onClick={() => {
                  save(colors.filter((c) => c !== color));
                  if (accent === color) onSelect("moss");
                  requestAnimationFrame(() => {
                    if (group.current?.closest("[hidden]")) return;
                    const swatches = group.current?.querySelectorAll<HTMLButtonElement>(
                      `.${appearanceStyles.customSwatch}`,
                    );
                    const next = swatches?.[Math.min(index, swatches.length - 1)];
                    (
                      next ??
                      group.current?.querySelector<HTMLButtonElement>(
                        `.${appearanceStyles.addColor}, .${appearanceStyles.colorActions} button`,
                      )
                    )?.focus();
                  });
                }}
              >
                <X size={12} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      {!editing ? (
        <button
          ref={addButton}
          className={appearanceStyles.addColor}
          disabled={colors.length >= 24}
          onClick={() => setEditing(true)}
        >
          <Plus size={15} /> Add color
        </button>
      ) : (
        <ColorEditor
          initial={parseHex(accent) ?? parseHex("#7e956f")!}
          onCancel={closeEditor}
          onAdd={(color) => {
            const hex = toHex(color);
            save([...new Set([...colors, hex])]);
            onSelect(hex as Accent);
            closeEditor();
          }}
        />
      )}
      {colors.length >= 24 && (
        <p className={sharedStyles.muted}>24 colors saved. Remove one to add another.</p>
      )}
      {storageError && (
        <div className={sharedStyles.settingsInlineError} role="status">
          <span>Colors are session-only.</span>
          <button onClick={() => save(colors)}>Retry colors</button>
        </div>
      )}
    </div>
  );
}
function ColorEditor({
  initial,
  onCancel,
  onAdd,
}: {
  initial: Color;
  onCancel: () => void;
  onAdd: (color: Color) => void;
}) {
  const id = useId();
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstInput.current?.focus();
  }, []);
  const [color, setColor] = useState(initial);
  const [format, setFormat] = useState<Format>("HEX");
  const [draft, setDraft] = useState<string[]>([toHex(initial)]);
  const [hue, setHue] = useState(toHsv(initial)[0]);
  function values(c: Color, f: Format): string[] {
    if (f === "HEX") return [toHex(c)];
    const nums = f === "RGBA" ? [c.r, c.g, c.b, c.a] : f === "HSV" ? toHsv(c) : toCmyk(c);
    return nums.map((n) => String(Math.round(n * 100) / 100));
  }
  function update(c: Color) {
    setColor(c);
    setDraft(values(c, format));
    const [h, s] = toHsv(c);
    if (s > 0) setHue(h);
  }
  const maxima =
    format === "RGBA"
      ? [255, 255, 255, 1]
      : format === "HSV"
        ? [360, 100, 100]
        : [100, 100, 100, 100];
  const labels =
    format === "HEX"
      ? ["HEX"]
      : format === "RGBA"
        ? ["R", "G", "B", "A"]
        : format === "HSV"
          ? ["H", "S", "V"]
          : ["C", "M", "Y", "K"];
  const numeric = draft.map(Number);
  const valid =
    format === "HEX"
      ? !!parseHex(draft[0] ?? "")
      : draft.every(
          (n, i) =>
            n.trim() !== "" &&
            Number.isFinite(numeric[i]) &&
            numeric[i]! >= 0 &&
            numeric[i]! <= maxima[i]!,
        );
  function edit(index: number, value: string) {
    const next = draft.map((old, i) => (i === index ? value : old));
    setDraft(next);
    if (format === "HEX") {
      const parsed = parseHex(next[0]!);
      if (parsed) {
        setColor(parsed);
        setHue(toHsv(parsed)[0]);
      }
      return;
    }
    const n = next.map(Number);
    if (
      !next.every(
        (v, i) => v.trim() !== "" && Number.isFinite(n[i]) && n[i]! >= 0 && n[i]! <= maxima[i]!,
      )
    )
      return;
    const c =
      format === "RGBA"
        ? { r: n[0]!, g: n[1]!, b: n[2]!, a: n[3]! }
        : format === "HSV"
          ? fromHsv(n[0]!, n[1]!, n[2]!, color.a)
          : fromCmyk(n[0]!, n[1]!, n[2]!, n[3]!, color.a);
    setColor(c);
    setHue(format === "HSV" ? n[0]! : toHsv(c)[0]);
  }
  const [, s, v] = toHsv(color);
  return (
    <section className={appearanceStyles.colorEditor} aria-label="Add custom color">
      <div className="color-picker-area">
        <div
          className={appearanceStyles.colorPlane}
          style={{ backgroundColor: toHex(fromHsv(hue, 100, 100)) }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = event.currentTarget.getBoundingClientRect();
            update(
              fromHsv(
                hue,
                Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
                Math.max(0, Math.min(100, 100 - ((event.clientY - rect.top) / rect.height) * 100)),
                color.a,
              ),
            );
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const rect = event.currentTarget.getBoundingClientRect();
            update(
              fromHsv(
                hue,
                Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
                Math.max(0, Math.min(100, 100 - ((event.clientY - rect.top) / rect.height) * 100)),
                color.a,
              ),
            );
          }}
        >
          <span
            className={appearanceStyles.colorCursor}
            style={{ left: `${s}%`, top: `${100 - v}%` }}
          />
        </div>
        <label className={appearanceStyles.colorSlider}>
          Hue
          <input
            aria-label="Hue"
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={(e) => {
              setHue(Number(e.target.value));
              update(fromHsv(Number(e.target.value), s, v, color.a));
            }}
          />
        </label>
        <div className={appearanceStyles.colorSvSliders}>
          <label>
            Saturation
            <input
              aria-label="Saturation"
              type="range"
              min="0"
              max="100"
              value={s}
              onChange={(e) => update(fromHsv(hue, Number(e.target.value), v, color.a))}
            />
          </label>
          <label>
            Brightness
            <input
              aria-label="Brightness"
              type="range"
              min="0"
              max="100"
              value={v}
              onChange={(e) => update(fromHsv(hue, s, Number(e.target.value), color.a))}
            />
          </label>
        </div>
      </div>
      <div className={appearanceStyles.colorEntry}>
        <div
          className={appearanceStyles.colorPreviewRow}
          title="Saved color. Interface shades adapt for readable contrast."
        >
          <span
            className={[appearanceStyles.colorPreview, appearanceStyles.checkerboard].join(" ")}
          >
            <span style={{ background: toHex(color) }} />
          </span>
          <span className={appearanceStyles.colorValue}>{toHex(color).toUpperCase()}</span>
        </div>
        <label className={appearanceStyles.colorFormat}>
          <span className={sharedStyles.srOnly}>Color format</span>
          <select
            aria-label="Color format"
            value={format}
            onChange={(e) => {
              const f = e.target.value as Format;
              setFormat(f);
              setDraft(values(color, f));
            }}
          >
            {(["HEX", "RGBA", "HSV", "CMYK"] as const).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <div className={appearanceStyles.colorFields}>
          {labels.map((label, i) => (
            <label key={`${format}-${label}`} htmlFor={`${id}-${i}`}>
              {label}
              <input
                ref={i === 0 ? firstInput : undefined}
                id={`${id}-${i}`}
                value={draft[i] ?? ""}
                inputMode={format === "HEX" ? "text" : "decimal"}
                aria-invalid={!valid}
                aria-describedby={!valid ? `${id}-error` : undefined}
                onChange={(e) => edit(i, e.target.value)}
              />
            </label>
          ))}
        </div>
        {!valid && (
          <p id={`${id}-error`} role="alert">
            {format === "HEX"
              ? "Enter 3, 4, 6 or 8 hexadecimal digits."
              : `Use ${format === "RGBA" ? "RGB 0–255 and alpha 0–1" : format === "HSV" ? "hue 0–360 and S/V 0–100" : "CMYK values 0–100"}.`}
          </p>
        )}
        <label className={appearanceStyles.opacityLabel}>
          Opacity <span>{Math.round(color.a * 100)}%</span>
          <input
            aria-label="Opacity"
            type="range"
            min="0"
            max="100"
            value={color.a * 100}
            onChange={(e) => update({ ...color, a: Number(e.target.value) / 100 })}
          />
        </label>
        {format === "CMYK" && <p className={sharedStyles.muted}>Screen approximation.</p>}
      </div>
      <div className={appearanceStyles.colorActions}>
        <button onClick={onCancel}>Cancel</button>
        <button className={sharedStyles.primary} disabled={!valid} onClick={() => onAdd(color)}>
          Add color
        </button>
      </div>
    </section>
  );
}
