# Warehouse Management Design System Guide

## Overview

This document provides comprehensive guidelines for maintaining visual and functional consistency across the entire Warehouse Management application. All developers must follow these guidelines when creating or modifying components.

---

## Color Palette

### Primary Colors
- **Charcoal** (`#222831` / `--color-charcoal-*`): Dark theme base, text, borders
- **Pearl** (`#EEEEEE` / `--color-pearl-*`): Light theme base, backgrounds
- **Cyan** (`#00ADB5` / `--color-cyan-*`): Brand accent, primary actions, shipped status

### Status Colors
- **Amber** (`--color-amber-*`): Pending, warning, in-progress states
- **Emerald** (`--color-emerald-*`): Received, success, completed states
- **Blue** (`--color-blue-*`): Sold, processing, info states
- **Pink/Rose** (`--color-pink-*`): Failed, cancel, special states
- **Purple** (`--color-purple-*`): Secondary, insights, alternative states

### Design Tokens Reference

```css
/* Usage in components */
--color-charcoal-50 to 950      /* Shades from light to dark */
--color-cyan-50 to 950           /* Brand accent shades */
--color-amber-50 to 950          /* Pending/Warning shades */
--color-emerald-50 to 950        /* Success/Received shades */
--color-blue-50 to 950           /* Info/Sold shades */
```

---

## Spacing System

All spacing should use these standardized values:

```javascript
// Design tokens in globals.css
--spacing-card: 1.5rem      /* Internal card padding */
--spacing-section: 2rem     /* Between major sections */
--spacing-page: 2.5rem      /* Page padding */

// Tailwind classes
px-4 py-3  // Table cells
px-3 py-2  // Form fields
px-4 py-4  // Card content
gap-4      // Grid gaps
space-y-6  // Vertical spacing between sections
```

---

## Reusable Components

### 1. MetricCard

**Purpose:** Display key metrics/statistics with colored backgrounds

**Location:** `src/components/ui/metric-card.tsx`

**Usage:**
```tsx
import { MetricCard } from '~/components/ui/metric-card';
import { Package, TrendingUp } from 'lucide-react';

<MetricCard
  title="Tổng sản phẩm"
  value={1234}
  description="Loại sản phẩm khác nhau"
  variant="blue"
  icon={<Package className="h-5 w-5" />}
/>
```

**Variants:**
- `"primary"` - Cyan (default brand color)
- `"cyan"` - Cyan (#00ADB5)
- `"blue"` - Blue (processing/info)
- `"emerald"` - Green (success/received)
- `"amber"` - Yellow (pending/warning)
- `"purple"` - Purple (secondary)
- `"pink"` - Pink/Rose (failed/cancel)

**Key Features:**
- Gradient background matching variant
- Icon with colored background
- Hover scale animation (1.02x)
- Card shadow with hover effect
- Responsive sizing

---

### 2. FilterCard

**Purpose:** Container for filter controls with glass-effect styling

**Location:** `src/components/ui/filter-card.tsx`

**Usage:**
```tsx
import { FilterCard } from '~/components/ui/filter-card';
import { Input, Select } from '~/components/ui/input';

<FilterCard title="Bộ lọc">
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    <Input placeholder="Tìm kiếm..." />
    <Select>
      {/* options */}
    </Select>
  </div>
</FilterCard>
```

**Key Features:**
- Glass-effect background (backdrop blur)
- Consistent padding (1.5rem)
- Optional title header
- Proper border colors
- Supports dark mode

---

### 3. DataTableCard

**Purpose:** Wraps data tables with consistent card styling

**Location:** `src/components/ui/data-table-card.tsx`

**Usage:**
```tsx
import { DataTableCard } from '~/components/ui/data-table-card';
import { Button } from '~/components/ui/button';

<DataTableCard
  title="Danh sách sản phẩm"
  action={
    <Button className="btn-primary">
      <Plus className="mr-2 h-4 w-4" />
      Thêm sản phẩm
    </Button>
  }
>
  <Table>
    {/* table content */}
  </Table>
</DataTableCard>
```

**Key Features:**
- Card shadow styling
- Flexible title and action support
- Proper content padding
- Responsive design

---

### 4. StatusBadge

**Purpose:** Display status indicators with semantic colors

**Location:** `src/components/ui/status-badge.tsx`

**Usage:**
```tsx
import { StatusBadge } from '~/components/ui/status-badge';
import { CheckCircle } from 'lucide-react';

<StatusBadge
  status="shipped"
  label="Đã giao"
  icon={<CheckCircle className="h-4 w-4" />}
/>
```

**Status Types:**
- `"pending"` - Amber/Yellow background
- `"received"` - Emerald/Green background
- `"sold"` - Blue background
- `"shipped"` - Cyan background
- `"processing"` - Amber background
- `"completed"` - Emerald background
- `"failed"` - Red background
- `"cancelled"` - Gray background

**Key Features:**
- Semantic color coding
- Optional icon support
- Inline badge styling
- Smooth transitions

---

## Button Styling

### Button Variants

All buttons should use these predefined classes:

```tsx
// Primary action buttons (cyan gradient)
<Button className="btn-primary">
  <Plus className="mr-2 h-4 w-4" />
  Action
</Button>

// Secondary buttons (outline style)
<Button className="btn-secondary">
  Secondary Action
</Button>

// Destructive buttons (red)
<Button className="btn-destructive">
  Delete
</Button>

// Ghost/Text buttons (use Shadcn variant)
<Button variant="ghost">
  Text Action
</Button>

// Outline buttons
<Button variant="outline">
  Outline Action
</Button>
```

### Button CSS Classes

```css
.btn-primary {
  @apply btn-scale bg-gradient-to-r from-cyan-500 to-cyan-600
    hover:from-cyan-600 hover:to-cyan-700 text-white font-medium
    shadow-md hover:shadow-lg active:shadow-sm;
}

.btn-secondary {
  @apply btn-scale bg-background border-2 border-charcoal-200
    hover:border-charcoal-300 text-foreground font-medium
    transition-all duration-200;
}

.btn-destructive {
  @apply btn-scale bg-red-500 hover:bg-red-600 text-white
    font-medium shadow-md hover:shadow-lg active:shadow-sm;
}
```

**Features:**
- `.btn-scale` - Scale animation (1.02x hover, 0.98x active)
- Smooth transitions (200ms)
- Shadow effects
- Proper color contrast

---

## Input Field Styling

All form inputs should follow this pattern:

```tsx
import { Input } from '~/components/ui/input';

<Input
  placeholder="Tìm kiếm..."
  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
/>
```

### Global Input Styling (in globals.css)

```css
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="date"],
textarea,
select {
  @apply h-10 border-2 border-charcoal-200 rounded-lg
    hover:border-primary/30 focus:border-primary
    focus:ring-2 focus:ring-primary/20 transition-colors duration-200;
}
```

**Key Features:**
- Height: 10 (2.5rem) for consistency
- 2px borders for visibility
- Hover state indication
- Focus ring with primary color
- Smooth color transitions

---

## Table Styling

### Table Structure

All data tables should follow this pattern:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.value}</TableCell>
        <TableCell className="text-right">{item.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Table CSS (in globals.css)

```css
table thead tr {
  @apply bg-muted/50;
}

table thead th {
  @apply font-semibold text-foreground/80 border-b border-border
    h-11 px-4 py-2;
}

table tbody tr {
  @apply hover:bg-primary/5 transition-colors duration-150
    border-b border-border/50;
}

table tbody td {
  @apply px-4 py-3 text-sm;
}

/* Alternating row colors for readability */
table tbody tr:nth-child(odd) {
  @apply bg-background;
}

table tbody tr:nth-child(even) {
  @apply bg-muted/20;
}
```

**Key Features:**
- Muted header background
- Hover effects (primary/5)
- Alternating row colors
- Proper padding and spacing
- Smooth transitions

---

## Card Styling

### Card Structure

All cards should use this base pattern:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

<Card className="card-shadow">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Using Specialized Card Components

**For Metrics:**
```tsx
<MetricCard
  title="Title"
  value={value}
  description="desc"
  variant="blue"
  icon={icon}
/>
```

**For Filters:**
```tsx
<FilterCard title="Filters">
  {/* filter controls */}
</FilterCard>
```

**For Data Tables:**
```tsx
<DataTableCard title="Data" action={button}>
  {/* table */}
</DataTableCard>
```

### Card Shadow Classes

```css
.card-shadow {
  box-shadow: var(--shadow-card);
  @apply transition-shadow duration-200;
}

.card-shadow:hover {
  box-shadow: var(--shadow-card-hover);
}

.card-shadow-active {
  box-shadow: var(--shadow-card-active);
}
```

---

## Page Layout

### Page Container

All pages should wrap content with `.page-container`:

```tsx
export default function PageName() {
  return (
    <div className="page-container">
      {/* Page content */}
    </div>
  );
}
```

### Page Header

Use `.page-header` for title sections:

```tsx
<div className="page-header">
  <div>
    <h1 className="page-title">Page Title</h1>
    <p className="page-subtitle">Optional subtitle</p>
  </div>
  <Button className="btn-primary">Action</Button>
</div>
```

### CSS Classes

```css
.page-container {
  @apply w-full space-y-6 p-6;
}

.page-header {
  @apply flex flex-col sm:flex-row justify-between items-start
    sm:items-center gap-4;
}

.page-title {
  @apply text-2xl sm:text-3xl font-bold text-foreground;
}

.page-subtitle {
  @apply text-sm text-muted-foreground mt-1;
}

.section-spacing {
  @apply space-y-4;
}
```

---

## Grid Layouts

### Metric Grids

```tsx
/* 4 columns on desktop, 2 on tablet, 1 on mobile */
<div className="metrics-grid">
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
</div>

/* 3 columns layout */
<div className="metrics-grid-3">
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
</div>

/* 2 columns layout */
<div className="metrics-grid-2">
  <MetricCard {...} />
  <MetricCard {...} />
</div>
```

### CSS Grid Classes

```css
.metrics-grid {
  @apply grid gap-4 md:grid-cols-2 lg:grid-cols-4;
}

.metrics-grid-3 {
  @apply grid gap-4 md:grid-cols-2 lg:grid-cols-3;
}

.metrics-grid-2 {
  @apply grid gap-4 md:grid-cols-2;
}
```

---

## Animations & Transitions

### Animation Classes

```css
/* Fade in with slide up */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s var(--ease-smooth);
}

/* Slide in from right */
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s var(--ease-smooth);
}

/* Shimmer loading effect */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  animation: shimmer 2s linear infinite;
}
```

### Easing Functions

```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);       /* Default smooth */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);  /* Playful */
--ease-snappy: cubic-bezier(0.2, 0, 0, 1);         /* Quick */

/* Usage */
.smooth-transition {
  @apply transition-all duration-200;
  transition-timing-function: var(--ease-smooth);
}
```

---

## Modal & Dialog Components

### Modal Structure

All modals should follow this pattern:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog';

const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Optional description</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      {/* Form content */}
    </div>
    <div className="flex gap-2 justify-end pt-4 border-t">
      <Button
        variant="outline"
        onClick={() => setIsOpen(false)}
        className="btn-secondary"
      >
        Cancel
      </Button>
      <Button className="btn-primary">
        Save
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Modal Sizes

```tsx
/* Small modal */
<DialogContent className="max-w-sm">

/* Medium modal (default) */
<DialogContent className="max-w-md">

/* Large modal */
<DialogContent className="max-w-2xl">

/* Extra large modal */
<DialogContent className="max-w-4xl">
```

---

## Form Patterns

### Form Component Structure

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ },
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input
              placeholder="Placeholder"
              {...field}
              className="h-10 border-2"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="flex gap-2 justify-end pt-4">
      <Button variant="outline" type="button">Cancel</Button>
      <Button className="btn-primary" type="submit">Submit</Button>
    </div>
  </form>
</Form>
```

### Form Styling

```tsx
// Always use space-y-4 between form fields
<form className="space-y-4">

// Input fields with consistent styling
<Input className="h-10 border-2 hover:border-primary/30 focus:border-primary" />

// Select dropdowns
<Select>
  <SelectTrigger className="h-10 border-2">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    {/* items */}
  </SelectContent>
</Select>

// Form section with spacing
<div className="space-y-2">
  <FormLabel>Label</FormLabel>
  <FormControl>
    {/* control */}
  </FormControl>
</div>
```

---

## Dark Mode Support

All components should support dark mode. Add dark-mode specific styles:

```tsx
// Dark mode styling in components
className="bg-background dark:bg-background text-foreground dark:text-foreground"

// Or use CSS dark selector in globals.css
.dark {
  --background: oklch(0.15 0.01 235);
  --foreground: oklch(0.95 0.01 210);
}

// Apply to components
input.dark {
  @apply border-charcoal-500/30 hover:border-cyan-500/30 focus:border-cyan-500;
}
```

---

## Badge Styling

### Status Badges

Use `StatusBadge` component for all status displays:

```tsx
import { StatusBadge } from '~/components/ui/status-badge';

<StatusBadge status="pending" label="Chờ xử lý" />
<StatusBadge status="shipped" label="Đã giao" icon={<CheckCircle />} />
```

### Custom Badges

For custom badges, use Shadcn Badge component:

```tsx
import { Badge } from '~/components/ui/badge';

<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>
```

---

## Common Component Patterns

### Metric Card Grid + Filter + Table Pattern

This is the standard pattern for all dashboard pages:

```tsx
'use client';

import { useState } from 'react';
import { MetricCard } from '~/components/ui/metric-card';
import { FilterCard } from '~/components/ui/filter-card';
import { DataTableCard } from '~/components/ui/data-table-card';
import { Button } from '~/components/ui/button';

export default function DashboardPage() {
  const [data, setData] = useState([]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Page Title</h1>
          <p className="page-subtitle">Description</p>
        </div>
        <Button className="btn-primary">Action</Button>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Metric 1"
          value={100}
          description="Description"
          variant="blue"
          icon={<Icon className="h-5 w-5" />}
        />
        {/* More metrics */}
      </div>

      {/* Filters */}
      <FilterCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Filter controls */}
        </div>
      </FilterCard>

      {/* Data Table */}
      <DataTableCard
        title="Data List"
        action={<Button className="btn-primary">Add</Button>}
      >
        <Table>
          {/* Table content */}
        </Table>
      </DataTableCard>
    </div>
  );
}
```

---

## Best Practices Checklist

When creating or modifying components:

- [ ] Use `MetricCard` for all metric displays
- [ ] Use `FilterCard` for all filter sections
- [ ] Use `DataTableCard` for all data tables
- [ ] Use `StatusBadge` for all status indicators
- [ ] Apply `btn-primary`, `btn-secondary`, `btn-destructive` to all buttons
- [ ] Use proper spacing tokens (gap-4, space-y-6, etc.)
- [ ] Add hover effects to interactive elements
- [ ] Support dark mode with proper contrast
- [ ] Use semantic color variants (amber for pending, emerald for success, etc.)
- [ ] Wrap pages with `.page-container`
- [ ] Use `.page-header` for title sections
- [ ] Apply `.metrics-grid` for metric layouts
- [ ] Use `space-y-4` for form field spacing
- [ ] Add proper focus states to form inputs
- [ ] Include smooth transitions (duration-200)
- [ ] Use consistent icon sizes (h-4 w-4 or h-5 w-5)

---

## File Organization

### Component Structure

```
src/components/
├── ui/                           # Reusable UI components
│   ├── metric-card.tsx
│   ├── filter-card.tsx
│   ├── data-table-card.tsx
│   ├── status-badge.tsx
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── [feature]/                    # Feature-specific components
│   ├── [Feature]ClientUI.tsx     # Main page component
│   ├── [Feature]Table.tsx        # Table component
│   ├── [Feature]Form.tsx         # Form component
│   ├── [Feature]Modal.tsx        # Modal components
│   └── [feature]Schema.ts        # Zod schemas & types
└── common/                       # Shared components
    ├── Sidebar.tsx
    ├── TopNav.tsx
    └── Layout.tsx
```

---

## Updating Design System

To update the design system:

1. **Colors:** Modify color scales in `src/styles/globals.css` (in @theme block)
2. **Components:** Update reusable components in `src/components/ui/`
3. **Utilities:** Add/modify utility classes in `src/styles/globals.css` (in @layer utilities)
4. **Guidelines:** Update this document

All changes automatically propagate to all components using the system!

---

## Support

For questions or updates to this design system:
1. Update the relevant component or utility class
2. Update this document
3. Create a commit with "refactor: update design system"
4. Notify the team of breaking changes

---

**Last Updated:** 2025-11-09
**Version:** 1.0.0
**Maintainers:** Frontend Team
