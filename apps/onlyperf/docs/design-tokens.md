# Design Tokens

This document outlines the design tokens and patterns used throughout the OnlyPerf e-commerce platform. These tokens ensure visual consistency and should be referenced when designing new components.

Last Updated: 2025-11-13

---

## Colors

### Brand Colors
- **Primary Brand**: `#4A1942` (Purple)
  - CSS Variable: `--primary: oklch(0.25 0.12 330)`
  - Dark Mode: `--primary: oklch(0.45 0.15 330)` (lighter purple)
  - Usage: Selected states, CTAs, brand highlights

- **Primary Foreground**: White
  - CSS Variable: `--primary-foreground: oklch(1 0 0)`
  - Usage: Text on primary brand background

### Brand Color Utilities (Tailwind Classes)

For consistent brand color usage across the platform, use these Tailwind utility classes:

**Background Colors:**
- `bg-brand` - Brand purple background (`oklch(0.25 0.12 330)` / `#4A1942`)
- `bg-brand-dark` - Darker purple for hover states (`oklch(0.20 0.12 330)` / `#3A1232`)
- `bg-brand/10` - 10% opacity brand purple (subtle highlights)
- `bg-brand/20` - 20% opacity brand purple (dark mode highlights)

**Text Colors:**
- `text-brand` - Brand purple text
- `text-brand-foreground` - White text (for use on brand backgrounds)
- `hover:text-brand` - Text changes to brand purple on hover

**Border Colors:**
- `border-brand` - Brand purple border
- `hover:border-brand` - Border changes to brand purple on hover

**Dark Mode Support:**
- All brand colors automatically adjust for dark mode
- Light mode: `oklch(0.25 0.12 330)` (darker purple)
- Dark mode: `oklch(0.45 0.15 330)` (lighter purple for better contrast)

**Common Patterns:**
```tsx
// Badge/pill with brand color
<span className="bg-brand text-white">New</span>

// Interactive element with brand hover
<button className="hover:bg-brand/10 hover:border-brand hover:text-brand">
  Click me
</button>

// Success state with brand color
<button className={showSuccess ? "bg-brand text-white" : "bg-black text-white"}>
  {showSuccess ? "Added!" : "Add to cart"}
</button>

// Active state pills/tabs
<button className="border-brand bg-brand text-white"> {/* active */}
<button className="border-brand text-brand hover:bg-brand/10"> {/* inactive */}
```

### Neutral Palette (Zinc)
- **Zinc-50**: `bg-zinc-50` - Light backgrounds, sidebars
- **Zinc-100**: `bg-zinc-100` - Subtle hover states
- **Zinc-200**: `border-zinc-200` - Default borders, dividers
- **Zinc-300**: `border-zinc-300` - Hover borders
- **Zinc-500**: `text-zinc-500` - Secondary/muted text
- **Zinc-600**: `text-zinc-600` - Body text, hover text
- **Zinc-700**: `text-zinc-700` - Icons
- **Zinc-900**: `text-zinc-900` - Primary text, headings

### Semantic Colors
- **Error/Danger**: `red-500`, `red-50`
  - Border: `border-red-500`
  - Text: `text-red-500`, `text-red-900`
  - Background: `bg-red-50`

- **Warning**: `yellow-50`, `yellow-200`, `yellow-800`, `yellow-900`
  - Background: `bg-yellow-50`
  - Border: `border-yellow-200`
  - Text: `text-yellow-800`, `text-yellow-900`

---

## Typography

### Hierarchy
- **Page Titles**: `text-3xl font-bold`
  - Example: "Tóm tắt đơn hàng"

- **Section Headings**: `text-lg font-semibold`
  - Example: "Thông tin nhận hàng", "Giỏ hàng"

- **Labels**: `text-base font-medium`
  - Example: Form field labels

- **Body Text**: `text-base`
  - Default paragraph text

- **Small Text**: `text-sm`
  - Helper text, descriptions

- **Extra Small**: `text-xs`
  - Disclaimers, fine print

### Font Weights
- **Bold**: `font-bold` (700) - Page titles
- **Semibold**: `font-semibold` (600) - Section headings, selected items
- **Medium**: `font-medium` (500) - Labels, emphasis
- **Regular**: Default - Body text

### Text Colors
- **Primary**: `text-zinc-900` - Headlines, important text
- **Secondary**: `text-zinc-600` - Body text, descriptions
- **Muted**: `text-zinc-500` - Helper text, placeholders
- **White**: `text-white` - Text on dark backgrounds
- **White with opacity**: `text-white/90` - Slightly muted white text

---

## Spacing

### Vertical Spacing (Gap Between Elements)
- **Major sections**: `space-y-8` (32px) - Between large content blocks
- **Form fields**: `space-y-6` (24px) - Between input groups
- **Related fields**: `space-y-4` (16px) - Between closely related inputs
- **Tight spacing**: `space-y-2` (8px) - Label to input
- **Minimal spacing**: `space-y-1` (4px) - Sub-labels

### Horizontal Spacing
- **Grid gaps**: `gap-8` (32px) - Major layout columns
- **Form columns**: `gap-6` (24px) - Side-by-side fields
- **Card grids**: `gap-3` (12px) - Address cards, item lists

### Padding
- **Large cards**: `p-8` (32px) - Form containers, major sections
- **Standard cards**: `p-6` (24px) - Address cards, payment options
- **Compact cards**: `p-4` (16px) - List items, summaries
- **Select dropdowns**: `p-1` (4px) - Internal spacing

### Margins
- **Page top**: `py-8` (32px vertical) - Page wrapper
- **Section bottom**: `mb-8`, `mb-6`, `mb-4` - Section separation

---

## Components

### Inputs & Form Controls

#### Text Inputs
- **Height**: `h-12` (48px) - Modern, touch-friendly
- **Border**: `border`, `border-zinc-200`
- **Border Radius**: `rounded-md`
- **Error State**: `border-red-500`
- **Placeholder**: `placeholder:text-muted-foreground`
- **Example**:
  ```tsx
  <Input
    className="h-12"
    placeholder="Tên"
  />
  ```

#### Select Dropdowns
- **Height**: `h-12` (48px) - Match text inputs
- **Component**: ShadCN Select (Radix UI based)
- **Border**: `border-zinc-200`
- **Disabled**: `disabled:cursor-not-allowed disabled:opacity-50`
- **Example**:
  ```tsx
  <SelectTrigger className="w-full h-12">
    <SelectValue placeholder="Chọn tỉnh/thành phố" />
  </SelectTrigger>
  ```

#### Radio Groups
- **Component**: ShadCN RadioGroup (Radix UI based)
- **Item Size**: `size-4` (16px)
- **Card Wrapper**: `border-2 p-6 rounded-lg`
- **Selected Card**: `border-primary bg-primary/5`
- **Example**:
  ```tsx
  <div className="relative rounded-lg border-2 p-6 cursor-pointer transition-all">
    <RadioGroupItem value="option" />
    <Label className="flex-1 cursor-pointer space-y-1">...</Label>
  </div>
  ```

#### Buttons
- **Standard Height**: `h-14` (56px) - Primary CTAs
- **Border Radius**: `rounded-md`
- **Primary Style**: `bg-primary hover:bg-primary/90`
- **Font**: `text-base font-semibold`
- **Full Width**: `w-full` (when appropriate)
- **Example**:
  ```tsx
  <Button className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90">
    Đặt hàng
  </Button>
  ```

### Cards

#### Standard Card
- **Border Radius**: `rounded-lg`
- **Border**: `border`, `border-zinc-200`
- **Background**: `bg-white`
- **Padding**: `p-8` (large content), `p-6` (standard)
- **Shadow**: `shadow-sm` (optional, subtle)

#### Sidebar Card (Order Summary)
- **Border Radius**: `rounded-xl` (slightly more rounded)
- **Border**: `border-zinc-200`
- **Background**: `bg-zinc-50` (subtle gray)
- **Padding**: `p-6`
- **Shadow**: `shadow-sm`
- **Position**: `sticky top-6` (when in sidebar)

#### Selected Card (Address Selection)
- **Border**: `border-primary` (2px)
- **Background**: `bg-primary`
- **Text**: `text-primary-foreground` (white)
- **Padding**: `p-6`
- **Example**:
  ```tsx
  <button className={`rounded-lg border p-6 ${
    isSelected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-zinc-200 bg-white hover:bg-zinc-50"
  }`}>
  ```

### Icons
- **Standard Size**: `w-5 h-5` (20px)
- **Small Size**: `w-4 h-4` (16px)
- **Color**: `text-zinc-700` (default), `text-white` (on dark bg)
- **Library**: Lucide React
- **Common Icons**: Plus, Minus, ChevronDown, CheckIcon, CircleIcon

---

## Interactive States

### Hover
- **Border**: `hover:border-zinc-300`, `hover:border-primary`
- **Background**: `hover:bg-zinc-50` (subtle), `hover:bg-primary/90` (buttons)
- **Text**: `hover:text-zinc-600`
- **Shadow**: `hover:shadow-sm` (cards)
- **Transition**: `transition-all` (smooth)

### Selected
- **Border**: `border-primary`
- **Background**: `bg-primary`
- **Text**: `text-primary-foreground` (white)
- **Background Variant**: `bg-primary/5` (subtle highlight, payment cards)

### Focus
- **Outline**: `outline-none` (remove default)
- **Ring**: `focus-visible:ring-2`, `focus-visible:ring-[3px]`
- **Ring Color**: `focus-visible:ring-ring/50`
- **Border**: `focus-visible:border-ring`

### Error
- **Border**: `border-red-500`
- **Text**: `text-red-500`, `text-red-900`
- **Background**: `bg-red-50` (containers)
- **Ring**: `aria-invalid:ring-destructive/20`

### Disabled
- **Cursor**: `disabled:cursor-not-allowed`
- **Opacity**: `disabled:opacity-50`
- **Background**: `disabled:bg-gray-100` (inputs)

---

## Animations & Transitions

### Standard Transitions
- **Colors**: `transition-colors duration-200`
- **All Properties**: `transition-all duration-200`
- **Transform**: `transition-transform duration-200`

### Icon Animations
- **Rotation**: `rotate-90`, `rotate-0`, `-rotate-90`
- **Opacity**: `opacity-0`, `opacity-100`
- **Combined Example** (Plus/Minus toggle):
  ```tsx
  <Plus className="transition-all duration-200 group-data-[state=open]:rotate-90 group-data-[state=open]:opacity-0" />
  <Minus className="transition-all duration-200 group-data-[state=closed]:opacity-0 group-data-[state=open]:opacity-100" />
  ```

### Accordion Animations
- **Data States**: `group-data-[state=open]`, `group-data-[state=closed]`
- **Radix UI**: Built-in animations via data attributes
- **Custom**: Rotation and opacity for icons

### Select/Dropdown Animations
- **Open**: `data-[state=open]:animate-in`, `data-[state=open]:zoom-in-95`
- **Close**: `data-[state=closed]:animate-out`, `data-[state=closed]:zoom-out-95`
- **Slide**: `data-[side=bottom]:slide-in-from-top-2`

---

## Layout Patterns

### Page Container
```tsx
<div className="min-h-screen bg-white py-8">
  <div className="container mx-auto max-w-6xl px-4">
    <h1 className="mb-8 text-3xl font-bold">Page Title</h1>
    {/* Content */}
  </div>
</div>
```

### Two-Column Layout (Form + Sidebar)
```tsx
<div className="grid gap-8 lg:grid-cols-3">
  {/* Main Content - 2/3 width */}
  <div className="lg:col-span-2">
    <form className="space-y-8">
      {/* Form sections */}
    </form>
  </div>

  {/* Sidebar - 1/3 width */}
  <div className="lg:col-span-1">
    <div className="sticky top-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
      {/* Summary content */}
    </div>
  </div>
</div>
```

### Form Section
```tsx
<div className="rounded-lg border bg-white p-8">
  <h2 className="mb-6 text-lg font-semibold">Section Title</h2>
  <div className="space-y-6">
    {/* Form fields */}
  </div>
</div>
```

### Grid of Cards
```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
  {items.map((item) => (
    <div key={item.id} className="rounded-lg border p-6">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

## Responsive Breakpoints

Using Tailwind's default breakpoints:
- **sm**: 640px - 2-column grids
- **md**: 768px - (not heavily used)
- **lg**: 1024px - Main layout shifts (sidebar appears, 3-column grids)
- **xl**: 1280px - (not heavily used)

### Common Responsive Patterns
- `grid-cols-1 sm:grid-cols-2` - 1 column mobile, 2 columns tablet+
- `lg:grid-cols-3` - 3-column layout on desktop
- `lg:col-span-2` - Span 2 columns on desktop
- `grid grid-cols-2 gap-6` - Fixed 2 columns (name fields)

---

## Component Library

### ShadCN UI Components Used
- **Select** - Dropdown selects (Province, District, Ward)
- **RadioGroup** - Payment method selection
- **Accordion** - FAQ section
- **Button** - Primary CTAs
- **Input** - Text inputs
- **Label** - Form labels

All ShadCN components are:
- Built on Radix UI primitives
- Located in `/src/components/ui/`
- Styled with Tailwind CSS
- Accessible by default (ARIA, keyboard navigation)

### Installation Command
```bash
npx shadcn@latest add [component-name]
```

---

## Best Practices

1. **Consistency**: Always reference these tokens before creating new components
2. **Spacing**: Use the established spacing scale (2, 4, 6, 8)
3. **Typography**: Maintain the heading hierarchy
4. **Colors**: Prefer zinc palette for neutrals, only use primary for highlights
5. **Inputs**: All form inputs should be `h-12` for touch-friendly UX
6. **States**: Always provide visual feedback for hover, focus, selected, and error states
7. **Transitions**: Keep animations subtle and fast (200ms)
8. **Mobile First**: Design for mobile, enhance for desktop with `lg:` breakpoints
9. **Accessibility**: Use semantic HTML, proper labels, and ARIA attributes
10. **ShadCN**: Prefer ShadCN components for new UI elements when available

---

## Examples by Component Type

### Address Selection Card
```tsx
<button
  className={`group rounded-lg border p-6 text-left transition-all hover:border-primary hover:shadow-sm ${
    isSelected
      ? "border-primary bg-primary text-primary-foreground"
      : "border-zinc-200 bg-white hover:bg-zinc-50"
  }`}
>
  <p className={`font-semibold text-base ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
    Name
  </p>
  <div className={`text-sm ${isSelected ? 'text-white/90' : 'text-zinc-600'}`}>
    Address details
  </div>
</button>
```

### Payment Option Card
```tsx
<div className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
  isSelected
    ? "border-primary bg-primary/5"
    : "border-zinc-200 hover:border-zinc-300"
}`}>
  <div className="flex items-start gap-4">
    <RadioGroupItem value="option" />
    <Label className="flex-1 cursor-pointer space-y-1">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-zinc-700">...</svg>
        <span className="text-base font-semibold">Payment Method</span>
      </div>
      <p className="text-sm text-zinc-600">Description</p>
    </Label>
  </div>
</div>
```

### Form Field
```tsx
<div className="space-y-2">
  <Label htmlFor="field" className="text-base font-medium">
    Field Name *
  </Label>
  <Input
    id="field"
    placeholder="Placeholder"
    className={`h-12 ${error ? "border-red-500" : ""}`}
  />
  {error && (
    <p className="text-sm text-red-500 mt-1">{error.message}</p>
  )}
</div>
```

### Error Alert
```tsx
<div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-900">
  Error message here
</div>
```

### Warning Alert
```tsx
<div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
  <h3 className="text-sm font-semibold text-yellow-900 mb-2">
    ⚠️ Warning Title
  </h3>
  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
    <li>Warning item 1</li>
    <li>Warning item 2</li>
  </ul>
</div>
```

---

## Changelog

- **2025-11-13**: Brand color standardization
  - Added reusable Tailwind brand color utilities (`bg-brand`, `text-brand`, `border-brand`, etc.)
  - Extended Tailwind CSS v4 theme with `--brand`, `--brand-dark`, and `--brand-foreground` colors
  - Updated all emerald/green accent colors to brand purple throughout the platform
  - Components updated: CartBadge, ProductCard, ProductRecommendations, ProductRailClient, FAQ Accordion
  - Added Brand Color Utilities documentation section with usage examples
  - Dark mode support for all brand colors (auto-adjusts lightness)

- **2025-11-12**: Initial documentation created
  - Brand purple primary color established (#4A1942)
  - ShadCN Select and RadioGroup components integrated
  - Modern form field heights (h-12) standardized
  - Address selection highlighting pattern defined
  - FAQ accordion icon animation pattern documented
  - Two-column layout pattern (form + sidebar) established
