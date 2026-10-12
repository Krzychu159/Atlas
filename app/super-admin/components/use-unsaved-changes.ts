"use client";

import { useEffect } from "react";

export function useUnsavedChanges(dirty: boolean, busy: boolean) {
  useEffect(() => {
    if (!dirty && !busy) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
      const action = event.target.closest("a[href], [data-discard-changes]");
      if (!action || action.hasAttribute("disabled")) return;
      if (action instanceof HTMLAnchorElement && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || action.target === "_blank" || action.hasAttribute("download") || action.getAttribute("href")?.startsWith("#"))) return;
      if (busy || !window.confirm("Masz niezapisane zmiany. Czy chcesz je odrzucić i opuścić formularz?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigation, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigation, true);
    };
  }, [dirty, busy]);
}
