"use client";

import { motion } from "framer-motion";
import { ChevronRight, Menu, Search, ShoppingCart, User } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const CartBadge = dynamic(
  () => import("../CartBadge").then((mod) => ({ default: mod.CartBadge })),
  {
    ssr: false,
  },
);

const NavAuthSection = dynamic(
  () =>
    import("./NavAuthSection").then((mod) => ({ default: mod.NavAuthSection })),
  {
    ssr: false,
    loading: () => (
      <div className="hidden md:inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium">
        <User
          className="mr-2 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="text-muted-foreground">...</span>
      </div>
    ),
  },
);

import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavbarProps {
  className?: string;
}

interface NavLink {
  label: string;
  href: string;
  description?: string;
}

// TODO: Replace static navigation with Shopify Navigation API once available.
const NAV_LINKS: NavLink[] = [
  {
    label: "Vợt",
    // TODO: dynamic link from shopify
    href: "/collections/vot-pickle-ball",
    description: "Vợt pickleball chất lượng cao cho người chơi mọi trình độ.",
  },
  {
    label: "Quần áo",
    // TODO: dynamic link from shopify
    href: "/collections/quan-ao",
    description: "Trang phục thể thao thoáng khí, thoải mái cho pickleball.",
  },
  {
    label: "Banh",
    // TODO: dynamic link from shopify
    href: "/collections/banh-pickle-ball",
    description: "Banh pickleball tiêu chuẩn thi đấu, độ bền cao.",
  },
  {
    label: "Tin tức",
    // TODO: dynamic link from shopify
    href: "/blogs",
    description: "Mẹo, kỹ thuật và tin tức mới nhất về pickleball.",
  },
  {
    label: "Liên hệ",
    href: "/contact",
    description: "Thông tin liên hệ, các trang mạng xã hội và thương mại điện tử.",
  },
];

const SEARCH_QUICK_LINKS: NavLink[] = [
  { label: "Hàng mới về", href: "/collections?sort=new" },
  { label: "Bán chạy nhất", href: "/collections?sort=best" },
  { label: "Thẻ quà tặng", href: "/collections/gift-card" },
  { label: "Cửa hàng", href: "/stores" },
];

export function Navbar({ className }: NavbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const desktopLinks = useMemo(
    () =>
      NAV_LINKS.map((item) => (
        <NavigationMenuItem key={item.label}>
          <NavigationMenuLink asChild>
            <Link href={item.href} className={`${navigationMenuTriggerStyle()} hover:!text-primary hover:underline hover:decoration-primary`}>
              {item.label}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      )),
    [],
  );

  return (
    <motion.header
      className={cn(
        "backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b border-border/60 bg-background",
        className,
      )}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="container-max flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Mở menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-xs p-0">
              <SheetHeader className="items-start gap-2 p-4">
                <SheetTitle className="text-lg font-semibold">
                  OnlyPerf
                </SheetTitle>
                <SheetDescription>
                  Khám phá bộ sưu tập được thiết kế cho vận động viên chuyên
                  nghiệp.
                </SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 py-4">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-md px-3 pl-0 py-2 text-sm font-medium hover:!text-primary hover:underline hover:decoration-primary"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.description ? (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                    <ChevronRight className="size-4 opacity-50" />
                  </Link>
                ))}
                <Separator className="my-2" />
                <NavAuthSection
                  variant="mobile"
                  onNavigate={() => setIsMobileOpen(false)}
                />
              </nav>
              <Separator />
              <SheetFooter className="gap-3 text-sm text-muted-foreground">
                Cần hỗ trợ? <Link href="/contact" className="hover:!text-primary hover:underline hover:decoration-primary">Liên hệ</Link>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Link
            href="/"
            className="flex items-center"
            aria-label="Về trang chủ OnlyPerf"
          >
            <Image
              src="/images/PERF-logo-black.png"
              alt="OnlyPerf"
              width={40}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        <nav className="hidden flex-1 justify-center md:flex">
          <NavigationMenu>
            <NavigationMenuList>{desktopLinks}</NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="flex items-center gap-1">
          {/* TODO: Implement search functionality later */}
          {/* <Button
            variant="ghost"
            size="icon"
            aria-label="Tìm kiếm"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="size-5" />
          </Button> */}
          <NavAuthSection variant="desktop" />
          <Link
            href="/cart"
            className="flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium hover:!text-primary hover:underline hover:decoration-primary"
            aria-label="Mở giỏ hàng"
          >
            <div className="relative mr-2">
              <ShoppingCart className="size-5" aria-hidden="true" />
              <CartBadge />
            </div>
            <span className="hidden sm:inline">Giỏ hàng</span>
          </Link>
        </div>
      </div>

      <CommandDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        title="Tìm kiếm OnlyPerf"
        description="Liên kết nhanh và tìm kiếm hàng đầu"
      >
        <CommandInput placeholder="Tìm kiếm sản phẩm, danh mục…" />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          <CommandGroup heading="Phím tắt">
            {SEARCH_QUICK_LINKS.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => {
                  setIsSearchOpen(false);
                  window.location.href = item.href;
                }}
              >
                <span>{item.label}</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </motion.header>
  );
}
