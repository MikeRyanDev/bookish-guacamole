import type { ButtonHTMLAttributes, ReactNode } from "react";
/** A compact action with a persistent accessible name and a focus-visible tooltip. */
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <span className="icon-control">
      <button
        type="button"
        {...props}
        aria-label={label}
        className={`icon-button ${props.className ?? ""}`}
      >
        {children}
      </button>
      <span className="tooltip" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}
