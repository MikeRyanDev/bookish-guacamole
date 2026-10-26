import sharedStyles from "../styles/shared.module.css";
import type { ButtonHTMLAttributes, ReactNode } from "react";
/** A compact action with a persistent accessible name and a focus-visible tooltip. */
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <span className={sharedStyles.iconControl}>
      <button
        type="button"
        {...props}
        aria-label={label}
        className={`${sharedStyles.iconButton} ${props.className ?? ""}`}
      >
        {children}
      </button>
      <span className={sharedStyles.tooltip} aria-hidden="true">
        {label}
      </span>
    </span>
  );
}
