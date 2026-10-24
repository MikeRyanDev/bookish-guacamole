import { useEffect, useState } from "react";

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
export type Accent = (typeof ACCENTS)[number]["id"];
export type Theme = "light" | "dark";
export type Appearance = { theme: Theme; accent: Accent };

export function readAppearance(): Appearance {
  try {
    const accent = localStorage.getItem("starter-accent");
    return {
      theme: localStorage.getItem("starter-theme") === "dark" ? "dark" : "light",
      accent: ACCENTS.find((entry) => entry.id === accent)?.id ?? "moss",
    };
  } catch {
    return { theme: "light", accent: "moss" };
  }
}

/** Apply before React mounts so persisted appearance also covers bootstrap states. */
export function applyAppearance({ theme, accent }: Appearance) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = accent;
  const palette = ACCENTS.find((entry) => entry.id === accent) ?? ACCENTS[0];
  root.style.setProperty("--accent", palette[theme]);
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(readAppearance);
  useEffect(() => {
    applyAppearance(appearance);
    try {
      localStorage.setItem("starter-theme", appearance.theme);
      localStorage.setItem("starter-accent", appearance.accent);
    } catch {
      // Private/restricted storage must not prevent changing appearance this session.
    }
  }, [appearance]);
  return {
    ...appearance,
    setTheme: (theme: Theme) => setAppearance((previous) => ({ ...previous, theme })),
    setAccent: (accent: Accent) => setAppearance((previous) => ({ ...previous, accent })),
  };
}
