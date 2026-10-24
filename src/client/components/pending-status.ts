import { createElement, useEffect, useState } from "react";

/** Shows feedback for slow operations without flashing text during fast thread switches. */
export function PendingStatus({ children }: { children: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(timer);
  }, []);
  return visible ? createElement("p", { role: "status", className: "muted" }, children) : null;
}
