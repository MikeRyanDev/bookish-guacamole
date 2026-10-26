import appearanceStyles from "../styles/appearance.module.css";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { CustomColors } from "./custom-colors";
import { ACCENTS, type Accent, type Theme } from "../appearance";

export function AppearanceSettings({
  theme,
  accent,
  setTheme,
  setAccent,
}: {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}) {
  return (
    <section className={appearanceStyles.appearanceSettings} aria-label="Appearance">
      <fieldset>
        <legend>Theme</legend>
        <div className={appearanceStyles.modeOptions}>
          {(["light", "dark", "system"] as const).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="theme"
                value={mode}
                checked={theme === mode}
                onChange={() => setTheme(mode)}
              />
              <span>
                {mode === "light" ? (
                  <Sun size={16} />
                ) : mode === "dark" ? (
                  <Moon size={16} />
                ) : (
                  <Monitor size={16} />
                )}
                {mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          Accent{" "}
          <span>
            {ACCENTS.find((entry) => entry.id === accent)?.name ??
              (accent.startsWith("#") ? accent.toUpperCase() : "")}
          </span>
        </legend>
        <div className={appearanceStyles.accentOptions}>
          {ACCENTS.map((entry) => (
            <label key={entry.id} title={entry.name}>
              <input
                type="radio"
                name="accent"
                value={entry.id}
                checked={accent === entry.id}
                onChange={() => setAccent(entry.id)}
                aria-label={entry.name}
              />
              <span
                className={appearanceStyles.accentSwatch}
                style={{ backgroundColor: entry.swatch }}
              >
                {accent === entry.id && <Check size={17} strokeWidth={2.5} aria-hidden="true" />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <CustomColors accent={accent} onSelect={setAccent} />
    </section>
  );
}
