import { ListIcon } from 'lucide-react';
import type { ArticleHeading } from '@/lib/shopify/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface TableOfContentsMobileProps {
  headings: ArticleHeading[];
}

export function TableOfContentsMobile({ headings }: TableOfContentsMobileProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <Accordion type="single" collapsible defaultValue="toc">
        <AccordionItem value="toc" className="border-none">
          <AccordionTrigger className="px-6 py-4 text-sm font-semibold text-zinc-900 hover:no-underline dark:text-white">
            <div className="flex items-center gap-2">
              <ListIcon className="h-4 w-4" />
              <span className="uppercase tracking-wide">Mục lục</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <ul className="space-y-2">
              {headings.map((heading) => (
                <li
                  key={heading.id}
                  className={`
                    ${heading.level === 2 ? 'ml-0' : ''}
                    ${heading.level === 3 ? 'ml-4' : ''}
                    ${heading.level === 4 ? 'ml-8' : ''}
                  `}
                >
                  <a
                    href={`#${heading.id}`}
                    className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
