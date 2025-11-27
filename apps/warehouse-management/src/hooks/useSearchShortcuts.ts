import { useEffect } from "react";

interface UseSearchShortcutsOptions {
  onOpenSearch?: () => void;
  onCloseSearch?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelectItem?: () => void;
  enabled?: boolean;
}

export function useSearchShortcuts({
  onOpenSearch,
  onCloseSearch,
  onNavigateUp,
  onNavigateDown,
  onSelectItem,
  enabled = true,
}: UseSearchShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Command/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onOpenSearch?.();
      }

      // Escape to close search
      if (event.key === "Escape") {
        onCloseSearch?.();
      }

      // Arrow navigation
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onNavigateUp?.();
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        onNavigateDown?.();
      }

      // Enter to select
      if (event.key === "Enter") {
        onSelectItem?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    onOpenSearch,
    onCloseSearch,
    onNavigateUp,
    onNavigateDown,
    onSelectItem,
  ]);
}