'use client';

import { useEffect, useState } from 'react';
import { ListIcon } from 'lucide-react';
import type { ArticleHeading } from '@/lib/shopify/types';

interface TableOfContentsProps {
  headings: ArticleHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    // Helper function to find the currently visible heading
    const findActiveHeading = () => {
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Edge case 1: Near top of page (within 200px) - activate first heading
      if (scrollTop < 200) {
        return headings[0].id;
      }

      // Edge case 2: Near bottom of page - activate last heading
      if (scrollTop + viewportHeight >= documentHeight - 100) {
        return headings[headings.length - 1].id;
      }

      // Normal case: Find heading closest to top of viewport (accounting for header)
      const headerOffset = 120; // Approximate header height + some padding
      let activeHeading = headings[0].id;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const heading of headings) {
        const element = document.getElementById(heading.id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        const distanceFromTop = Math.abs(rect.top - headerOffset);

        // If this heading is visible and closer to our target position
        if (rect.top >= 0 && rect.top <= viewportHeight && distanceFromTop < closestDistance) {
          closestDistance = distanceFromTop;
          activeHeading = heading.id;
        }

        // If heading is above viewport but the next one hasn't appeared yet
        if (rect.top < headerOffset) {
          activeHeading = heading.id;
        }
      }

      return activeHeading;
    };

    // Initial check
    const initialActive = findActiveHeading();
    if (initialActive) {
      setActiveId(initialActive);
    }

    // Scroll event handler with throttling
    let scrollTimeout: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        const newActiveId = findActiveHeading();
        setActiveId(newActiveId);
      }, 50); // 50ms throttle for smooth updates
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup function
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [headings]);

  // Handle smooth scroll when clicking TOC items
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Update URL hash without page reload
      window.history.pushState(null, '', `#${id}`);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      className="rounded-lg" 
      aria-label="Table of contents"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <ListIcon className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
        <h3 className="text-sm !my-0 font-semibold uppercase tracking-wide text-zinc-900 dark:text-white">
          Mục lục
        </h3>
      </div>

      {/* List of headings */}
      <ul className="space-y-2 !pl-2">
        {headings.map(({ id, text, level }) => (
          <li
            key={id}
            className={`
              transition-all list-none duration-200
              ${level === 2 ? 'ml-0' : ''}
              ${level === 3 ? 'ml-4' : ''}
              ${level === 4 ? 'ml-8' : ''}
            `}
          >
            <a
              href={`#${id}`}
              onClick={(e) => handleClick(e, id)}
              className={`
                block rounded-md px-3 py-2 text-sm transition-all duration-200
                ${
                  activeId === id
                    ? // Active state: highlighted background, bold, blue text
                      'bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : // Inactive state: gray text with hover
                      'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                }
              `}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
