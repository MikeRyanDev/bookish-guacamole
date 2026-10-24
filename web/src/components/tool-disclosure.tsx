import { createContext, useContext, useState, type ReactNode } from "react";

type DisclosureState = {
  choices: ReadonlyMap<string, boolean>;
  set: (id: string, open: boolean) => void;
};
const DisclosureContext = createContext<DisclosureState | undefined>(undefined);
const CallContext = createContext<string | undefined>(undefined);

/** Retains only explicit UI choices for the mounted conversation, including virtual remounts. */
export function ToolDisclosureProvider({ children }: { children: ReactNode }) {
  const [choices, setChoices] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  return (
    <DisclosureContext.Provider
      value={{
        choices,
        set: (id, open) => setChoices((previous) => new Map(previous).set(id, open)),
      }}
    >
      {children}
    </DisclosureContext.Provider>
  );
}

/** Supplies stable call identity to the SDK's registered tool renderer. */
export function ToolDisclosureScope({ id, children }: { id: string; children: ReactNode }) {
  return <CallContext.Provider value={id}>{children}</CallContext.Provider>;
}

/** Uses shared choices in a transcript and local choices for standalone approval/preview surfaces. */
export function useToolDisclosure(defaultOpen: boolean, explicitId?: string) {
  const shared = useContext(DisclosureContext);
  const callId = useContext(CallContext);
  const id = explicitId ?? callId;
  const [local, setLocal] = useState<boolean>();
  const open = (shared && id ? shared.choices.get(id) : local) ?? defaultOpen;
  return [
    open,
    (next: boolean) => {
      if (shared && id) shared.set(id, next);
      else setLocal(next);
    },
  ] as const;
}
