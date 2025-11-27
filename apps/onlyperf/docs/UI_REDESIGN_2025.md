# OnlyPerf Landing Page UI Redesign

**Date:** November 2025
**Scope:** Complete home page UI overhaul based on design review

## Overview

Comprehensive UI improvements covering all 8 major sections of the landing page, implementing modern design patterns with improved spacing, typography, and visual hierarchy.

---

## Design System Changes

### Color Palette Update

| Token | Old Value | New Value | Hex Equivalent |
|-------|-----------|-----------|----------------|
| `--primary` | `oklch(0.25 0.12 330)` | `oklch(0.585 0.233 292)` | `#8B5CF6` |
| `--brand` | `oklch(0.25 0.12 330)` | `oklch(0.585 0.233 292)` | `#8B5CF6` |
| `--brand-dark` | `oklch(0.2 0.12 330)` | `oklch(0.525 0.233 292)` | Darker purple |

New supporting colors added:
- `--dark`: `oklch(0.15 0 0)` (#1a1a1a)
- `--light-gray`: `oklch(0.96 0 0)` (#f5f5f5)
- `--medium-gray`: `oklch(0.45 0 0)` (#666666)

### New Utility Classes

```css
/* Section spacing - 80-96px vertical padding */
@utility section-padding { ... }

/* Card hover lift effect */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
}

/* Narrow container for FAQ - 800px max */
@utility container-narrow { ... }
```

### Button Component

Added `xl` size variant for hero CTAs:
```typescript
xl: "h-12 rounded-xl px-6 text-base has-[>svg]:px-5"
```

---

## Section-by-Section Changes

### 1. Header/Navbar

**File:** `src/components/home/Navbar.tsx`

| Property | Before | After |
|----------|--------|-------|
| Height | `py-4` (64px) | `py-5 md:py-6` (70-80px) |
| Horizontal padding | `px-4` | `px-4 md:px-10` (40px desktop) |
| Logo size | `h-10` (40px) | `h-12 md:h-14` (48-56px) |
| Nav item spacing | `gap-1` | `gap-6 md:gap-8` (32-40px) |
| Cart/Login font | `font-medium` | `font-semibold` |
| Border | Always visible | Scroll-triggered shadow |

**New feature:** Scroll shadow effect using `useEffect` hook to detect scroll position.

---

### 2. Hero Section

**File:** `src/components/home/HeroCarouselClient.tsx`

| Property | Before | After |
|----------|--------|-------|
| Min height | `480px / 560px` | `560px / 640px` |
| Headline size | `text-2xl / text-4xl / text-6xl` | `text-3xl / text-5xl / text-[56px]` |
| Description width | `max-w-xl` | `max-w-[500px]` |
| CTA button | Default size | `size="xl"` (48px height) |
| Pagination dots | `h-2 w-8 bg-primary` | `h-1.5 w-6 bg-white` |

---

### 3. Product Section

**File:** `src/components/home/ProductRailClient.tsx`

| Property | Before | After |
|----------|--------|-------|
| Section spacing | `space-y-2` | `mt-16 md:mt-20 space-y-8` |
| Section header | None | `<h2>Sản phẩm</h2>` (sentence case) |
| Tab style | Pill/rounded with border | Underline (3px brand color) |
| Tab text | Uppercase, 12px | Capitalize, 16px |
| Card radius | `rounded-[32px]` | `rounded-xl` (12px) |
| Card hover | None | `hover:-translate-y-1 hover:shadow-lg` |
| Price text | `text-base font-bold` | `text-lg font-semibold` |

---

### 4. Category Cards

**File:** `src/components/home/CategoryCardsClient.tsx`

| Property | Before | After |
|----------|--------|-------|
| Header style | Uppercase, 14px, zinc-500 | Sentence case, 28-32px, zinc-900 |
| Grid gap | `gap-4` | `gap-6 md:gap-8` |
| Card radius | None | `rounded-2xl` |
| Image hover | None | `scale-[1.03]` |
| Label size | `text-lg sm:text-xl` | `text-lg md:text-xl font-medium` |
| Gradient | `from-black/60` | `from-black/70` (stronger) |

---

### 5. Discovery/Image Banners

**File:** `src/components/home/ImageBannerStackClient.tsx`

| Property | Before | After |
|----------|--------|-------|
| Section padding | None | `py-16 md:py-24` |
| Header style | Uppercase, 14px | Sentence case, 28-32px |
| Image constraint | None | `max-h-[60vh] md:max-h-[70vh]` |

---

### 6. Community Gallery

**File:** `src/components/GalleryClient.tsx`

| Property | Before | After |
|----------|--------|-------|
| Grid gap | `gap-4` | `gap-2 md:gap-3` |
| Aspect ratio | `aspect-[3/4]` | `aspect-square` (1:1) |
| Border radius | `rounded-3xl` | `rounded-lg` (8px) |
| Image limit | All items | Max 8 images |

**File:** `src/components/home/OurPlayersSection.tsx`
- Header: Sentence case, 28-32px
- Added "Xem thêm" CTA link below gallery

---

### 7. FAQ Section

**File:** `src/components/home/FaqSection.tsx`

| Property | Before | After |
|----------|--------|-------|
| Section padding | `space-y-8` | `py-16 md:py-24` |
| Content width | Full width | `max-w-3xl mx-auto` (800px) |
| Header alignment | Left | Center |
| Item spacing | `space-y-3` | `space-y-4 md:space-y-5` |

**File:** `src/components/ui/accordion.tsx`
- Icon size: `h-5 w-5` → `h-6 w-6`
- Icon color: `text-zinc-900` → `text-brand`
- Open state: Added `bg-zinc-50/50` background

---

### 8. Footer

**File:** `src/components/layout/Footer.tsx`

| Property | Before | After |
|----------|--------|-------|
| Background | `bg-zinc-50` (light) | `bg-[#1a1a1a]` (dark) |
| Padding | `py-12` | `py-16 md:py-20` |
| Column gap | `gap-8 lg:gap-12` | `gap-10 lg:gap-16` |
| Headings | `text-sm font-bold` | `text-xs uppercase tracking-[1px] text-zinc-400` |
| Links | `text-sm text-zinc-600` | `text-base text-zinc-500 hover:text-white` |
| Logo | 120x45px, black | 160x60px, white |
| Border | `border-zinc-200` | `border-zinc-800` |

---

## Files Modified

### Core Design System
1. `src/app/globals.css` - Color palette, utilities
2. `src/components/ui/button.tsx` - XL size variant
3. `src/components/ui/accordion.tsx` - Icon styling
4. `src/components/ui/navigation-menu.tsx` - Nav spacing

### Page Components
5. `src/components/home/Navbar.tsx`
6. `src/components/home/HeroCarouselClient.tsx`
7. `src/components/home/ProductRailClient.tsx`
8. `src/components/home/CategoryCardsClient.tsx`
9. `src/components/home/ImageBannerStackClient.tsx`
10. `src/components/GalleryClient.tsx`
11. `src/components/home/OurPlayersSection.tsx`
12. `src/components/home/FaqSection.tsx`
13. `src/components/layout/Footer.tsx`

---

## Design Principles Applied

### Spacing Scale
- 8px - Small gaps
- 16px - Card padding
- 24px - Element spacing
- 40px - Within-section spacing
- 80px - Between sections

### Typography Scale
- 14px - Captions, small text
- 16px - Body text
- 20px - Large body
- 28-32px - Section headers
- 48-56px - Hero headlines

### Interactive States
- All interactive elements have hover states
- Transitions: `transition: all 0.2s ease`
- Card hover lift: `translateY(-4px)` with enhanced shadow

---

## Notes

- Footer uses white logo variant (`/images/PERF-logo-white.png`)
- Dark mode compatibility maintained for most components
- Footer dark background may need separate dark mode handling
