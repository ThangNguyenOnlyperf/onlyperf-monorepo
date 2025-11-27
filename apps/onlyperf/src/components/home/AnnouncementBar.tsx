"use client";

import { Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "onlyperf:announcement-dismissed-at";
const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface AnnouncementBarProps {
  message: string;
  href?: string;
  ctaLabel?: string;
  className?: string;
}

export function AnnouncementBar({
  message,
  href,
  ctaLabel = "Tìm hiểu thêm",
  className,
}: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timestampRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!timestampRaw) {
      setIsVisible(true);
      return;
    }

    const timestamp = Number.parseInt(timestampRaw, 10);
    if (Number.isNaN(timestamp)) {
      setIsVisible(true);
      return;
    }

    const isExpired = Date.now() - timestamp > DISMISS_WINDOW_MS;
    setIsVisible(isExpired);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-primary min-h-[3rem] text-primary-foreground",
        "border-b border-primary/30",
        className,
      )}
    >
      <div className="container-max flex items-center justify-between gap-4 px-6 py-2 text-sm">
        <div className="flex items-center gap-3">
          <Megaphone className="size-4 shrink-0" aria-hidden="true" />
          <p className="font-medium tracking-wide">{message}</p>
          {href ? (
            <Link
              href={href}
              className="text-xs font-semibold uppercase tracking-wide underline underline-offset-4 hover:no-underline"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="size-8 shrink-0 rounded-full text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label="Đóng thông báo"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
