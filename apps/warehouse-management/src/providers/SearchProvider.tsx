"use client";

import * as React from "react";
import { GlobalSearchModal } from "~/components/search/GlobalSearchModal";

interface SearchContextType {
  openSearch: () => void;
  closeSearch: () => void;
  isSearchOpen: boolean;
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export function useSearch() {
  const context = React.useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}

interface SearchProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [open, setOpen] = React.useState(false);

  const openSearch = React.useCallback(() => setOpen(true), []);
  const closeSearch = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <SearchContext.Provider value={{ openSearch, closeSearch, isSearchOpen: open }}>
      {children}
      <GlobalSearchModal open={open} onOpenChange={setOpen} />
    </SearchContext.Provider>
  );
}