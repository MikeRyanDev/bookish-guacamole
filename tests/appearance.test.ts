// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCENTS, applyAppearance, readAppearance } from "../src/client/appearance.js";

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("appearance accessibility and persistence", () => {
  it("keeps every accent legible as text and a primary button in both modes", () => {
    for (const entry of ACCENTS) {
      expect(contrast(entry.light, "#fbfaf8"), `${entry.name} light text`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(entry.light, "#ffffff"), `${entry.name} light button`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(entry.dark, "#141517"),
        `${entry.name} dark text/button`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("uses existing saved mode and validates accent values", () => {
    localStorage.setItem("starter-theme", "dark");
    localStorage.setItem("starter-accent", "rose");
    expect(readAppearance()).toEqual({ theme: "dark", accent: "rose" });
    localStorage.setItem("starter-accent", "unknown");
    expect(readAppearance()).toEqual({ theme: "dark", accent: "moss" });
  });
  it("still boots when storage is denied", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readAppearance()).toEqual({ theme: "light", accent: "moss" });
    applyAppearance({ theme: "dark", accent: "coral" });
    expect(document.documentElement.dataset.accent).toBe("coral");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(ACCENTS[3].dark);
  });
});
