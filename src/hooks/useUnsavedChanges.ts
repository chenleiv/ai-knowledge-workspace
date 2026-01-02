import { useEffect } from "react";

type Options = {
  enabled: boolean;
  message?: string;
};

export function useUnsavedChangesWarning({ enabled, message }: Options) {
  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message ?? "";
      return message ?? "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, message]);
}
