/** sRGB channels (0–255), with independent opacity (0–1). */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}
const byte = (n: number) => Math.round(Math.max(0, Math.min(255, n)));
/** Parse CSS short/long hexadecimal notation, including optional alpha. */
export function parseHex(input: string): Color | null {
  let value = input.trim().replace(/^#/, "");
  if (!/^(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return null;
  if (value.length < 5) value = [...value].map((c) => c + c).join("");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: value.length === 8 ? parseInt(value.slice(6), 16) / 255 : 1,
  };
}
export function toHex(c: Color): string {
  return (
    "#" +
    [c.r, c.g, c.b, ...(c.a < 1 ? [c.a * 255] : [])]
      .map((n) => byte(n).toString(16).padStart(2, "0"))
      .join("")
  );
}
export function toHsv(c: Color): [number, number, number] {
  const r = c.r / 255,
    g = c.g / 255,
    b = c.b / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const h =
    d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, max === 0 ? 0 : (d / max) * 100, max * 100];
}
export function fromHsv(h: number, s: number, v: number, a = 1): Color {
  s /= 100;
  v /= 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return byte(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return { r: f(5), g: f(3), b: f(1), a };
}
/** Device-independent approximation for screen entry, not an ICC print conversion. */
export function toCmyk(c: Color): [number, number, number, number] {
  const k = 1 - Math.max(c.r, c.g, c.b) / 255;
  if (k === 1) return [0, 0, 0, 100];
  return [
    ((1 - c.r / 255 - k) / (1 - k)) * 100,
    ((1 - c.g / 255 - k) / (1 - k)) * 100,
    ((1 - c.b / 255 - k) / (1 - k)) * 100,
    k * 100,
  ];
}
export function fromCmyk(c: number, m: number, y: number, k: number, a = 1): Color {
  return {
    r: byte(255 * (1 - c / 100) * (1 - k / 100)),
    g: byte(255 * (1 - m / 100) * (1 - k / 100)),
    b: byte(255 * (1 - y / 100) * (1 - k / 100)),
    a,
  };
}
function luminance(c: Color) {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
/** Preserve the saved color; derive an opaque accent meeting 4.5:1 on UI surfaces. */
export function accessibleAccent(c: Color, theme: "light" | "dark"): string {
  const surfaces = (
    theme === "light" ? ["#fbfaf8", "#f2f2ee", "#ffffff"] : ["#141517", "#191a1d", "#25262a"]
  ).map((h) => luminance(parseHex(h)!));
  const target = theme === "light" ? 0 : 255;
  for (let step = 0; step <= 100; step++) {
    const t = step / 100;
    const candidate = {
      r: byte(c.r + (target - c.r) * t),
      g: byte(c.g + (target - c.g) * t),
      b: byte(c.b + (target - c.b) * t),
      a: 1,
    };
    const l = luminance(candidate);
    if (surfaces.every((s) => (Math.max(l, s) + 0.05) / (Math.min(l, s) + 0.05) >= 4.5))
      return toHex(candidate);
  }
  return theme === "light" ? "#000000" : "#ffffff";
}
