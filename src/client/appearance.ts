import { useEffect, useState } from "react";
import { accessibleAccent, parseHex } from "./colors.js";

export const ACCENTS = [
  { id: "moss", name: "Moss", swatch: "#7e956f", light: "#416447", dark: "#acc59c" },
  { id: "ochre", name: "Ochre", swatch: "#c8a354", light: "#806018", dark: "#dec080" },
  { id: "apricot", name: "Apricot", swatch: "#d39970", light: "#98532c", dark: "#e8b28c" },
  { id: "coral", name: "Coral", swatch: "#c88073", light: "#9c4c43", dark: "#e6a095" },
  { id: "rose", name: "Rose", swatch: "#b87f98", light: "#934b65", dark: "#dca2b9" },
  { id: "plum", name: "Plum", swatch: "#9b7d99", light: "#79516e", dark: "#c7a1c0" },
  { id: "iris", name: "Iris", swatch: "#9190b6", light: "#625b91", dark: "#b5acdd" },
  { id: "denim", name: "Denim", swatch: "#7b9aaf", light: "#426780", dark: "#99b8cc" },
] as const;
export type Accent = (typeof ACCENTS)[number]["id"] | `#${string}`;
export type Theme = "light" | "dark" | "system";
export type Appearance = { theme: Theme; accent: Accent };

export function readAppearance(): Appearance {
  try {
    const accent = localStorage.getItem("starter-accent");
    return {
      theme:
        localStorage.getItem("starter-theme") === "system"
          ? "system"
          : localStorage.getItem("starter-theme") === "dark"
            ? "dark"
            : "light",
      accent:
        accent?.startsWith("#") && parseHex(accent)
          ? (accent as Accent)
          : (ACCENTS.find((entry) => entry.id === accent)?.id ?? "moss"),
    };
  } catch {
    return { theme: "light", accent: "moss" };
  }
}

/** Apply before React mounts so persisted appearance also covers bootstrap states. */
export function applyAppearance({ theme, accent }: Appearance) {
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  root.dataset.accent = accent;
  const palette = ACCENTS.find((entry) => entry.id === accent) ?? ACCENTS[0];
  const custom = parseHex(accent);
  root.style.setProperty(
    "--accent",
    custom ? accessibleAccent(custom, resolved) : palette[resolved],
  );
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(readAppearance);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    applyAppearance(appearance);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyAppearance(appearance);
    media.addEventListener("change", update);
    try {
      localStorage.setItem("starter-theme", appearance.theme);
      localStorage.setItem("starter-accent", appearance.accent);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    return () => media.removeEventListener("change", update);
  }, [appearance]);
  return {
    ...appearance,
    storageError,
    retryStorage: () => setAppearance((previous) => ({ ...previous })),
    setTheme: (theme: Theme) => setAppearance((previous) => ({ ...previous, theme })),
    setAccent: (accent: Accent) => setAppearance((previous) => ({ ...previous, accent })),
  };
}
