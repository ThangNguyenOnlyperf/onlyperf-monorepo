"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface InfoTooltipProps {
  content: string;
  className?: string;
}

/**
 * Reusable info tooltip component
 * Displays a question mark icon that shows tooltip content on hover
 */
export function InfoTooltip({ content, className }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className || ""}`}
          aria-label="More information"
        >
          <HelpCircle className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
