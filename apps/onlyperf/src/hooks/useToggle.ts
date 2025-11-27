import { useCallback, useState } from "react";

/**
 * Custom hook for managing boolean toggle state
 * Useful for modals, accordions, dropdowns, etc.
 *
 * @param initialValue - Initial state value, defaults to false
 * @returns Tuple of [isOpen, toggle, setIsOpen]
 */
export function useToggle(initialValue = false) {
  const [isOpen, setIsOpen] = useState(initialValue);

  /**
   * Toggle the state between true and false
   */
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return [isOpen, toggle, setIsOpen] as const;
}
