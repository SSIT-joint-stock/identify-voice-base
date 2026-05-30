import { useEffect } from "react";

interface UseBeforeUnloadGuardOptions {
  enabled: boolean;
}

export function useBeforeUnloadGuard({ enabled }: UseBeforeUnloadGuardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
}
