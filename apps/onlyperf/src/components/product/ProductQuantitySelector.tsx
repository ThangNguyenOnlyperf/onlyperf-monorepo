"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ProductQuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  max?: number;
}

export function ProductQuantitySelector({
  quantity,
  onChange,
  max = 10,
}: ProductQuantitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const items = useMemo(
    () => Array.from({ length: max }, (_, i) => i + 1),
    [max],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = items.indexOf(quantity);
      setHighlightIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightIndex(-1);
    }
  }, [open, items, quantity]);

  useEffect(() => {
    if (open && highlightIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;

      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % items.length);
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + items.length) % items.length);
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightIndex >= 0) {
          onChange(items[highlightIndex]);
          setOpen(false);
        }
        break;
    }
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label
        id="qty-label"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Số lượng
      </label>
      <div className="relative inline-block w-full">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="qty-label"
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          className="w-full flex items-center cursor-pointer justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-zinc-600 dark:focus:ring-white"
        >
          <span>{quantity}</span>
          <ChevronDown className="ml-2 size-4 text-zinc-500" />
        </button>

        {open && (
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            aria-labelledby="qty-label"
            aria-activedescendant={
              highlightIndex >= 0 ? `qty-${items[highlightIndex]}` : undefined
            }
            className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          >
            {items.map((num, idx) => {
              const isSelected = num === quantity;
              const isHighlighted = highlightIndex === idx;
              return (
                <li
                  key={num}
                  role="option"
                  aria-selected={isSelected}
                  id={`qty-${num}`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onClick={() => {
                    onChange(num);
                    setOpen(false);
                  }}
                  className={`cursor-pointer rounded-md px-3 py-2 text-sm transition-colors ${
                    isHighlighted
                      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                  } ${isSelected ? "font-semibold" : "font-normal"}`}
                >
                  {num}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
