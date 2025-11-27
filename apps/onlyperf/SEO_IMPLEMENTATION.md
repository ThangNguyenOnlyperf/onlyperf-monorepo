# SEO Implementation Guide for OnlyPerf

## Overview
This document outlines the comprehensive SEO implementation for OnlyPerf e-commerce store built with Next.js 15.

## ✅ Implemented Features

### 1. **Core SEO Configuration** (`src/lib/seo/`)
- **config.ts**: Centralized SEO constants and utilities
- **metadata.ts**: Metadata generation for pages
- **structured-data.ts**: JSON-LD schema generators
- **index.ts**: Unified exports

### 2. **Technical SEO**

#### Robots.txt (`src/app/robots.ts`)
- Allows search engines to crawl all public pages
- Blocks admin, cart, checkout, and account areas
- Prevents duplicate content from sorted/filtered URLs
- Blocks AI crawlers (GPTBot, CCBot)
- References sitemap.xml

#### Sitemap.xml (`src/app/sitemap.ts`)
- Dynamically generates sitemap with all products and categories
- Includes:
  - Homepage (priority: 1.0)
  - Product listing page (priority: 0.9)
  - All category pages (priority: 0.8)
  - All product detail pages (priority: 0.7)
- Auto-updates with new products

#### Web Manifest (`public/site.webmanifest`)
- PWA support for mobile home screen installation
- Branded colors and icons

### 3. **Metadata Implementation**

#### Root Layout (`src/app/layout.tsx`)
Global metadata including:
- Title template: `%s | OnlyPerf`
- Meta description
- Open Graph tags
- Twitter Card tags
- Favicon configuration
- Viewport settings
- Robots directives
- Search engine verification placeholders

#### Home Page (`src/app/page.tsx`)
- Custom metadata with Vietnamese keywords
- Organization schema (Google Knowledge Panel)
- Website schema (Google search box)

#### Product Listing (`src/app/collections/page.tsx`)
- Dynamic metadata for all products page
- Breadcrumb schema

#### Category Pages (`src/app/collections/[handle]/page.tsx`)
- Dynamic metadata per category
- Collection schema
- Breadcrumb schema
- Product count in description

#### Product Detail Pages (`src/app/products/[handle]/page.tsx`)
- Dynamic metadata with product info
- Product schema with:
  - Price and currency
  - Availability status
  - Product images
  - Brand information
- Breadcrumb schema

### 4. **Structured Data (JSON-LD)**

All structured data follows schema.org standards for rich search results:

#### Organization Schema
```json
{
  "@type": "Organization",
  "name": "OnlyPerf",
  "logo": "...",
  "address": {...},
  "sameAs": [social media URLs]
}
```

#### Website Schema
Enables site search box in Google results

#### Product Schema
```json
{
  "@type": "Product",
  "name": "...",
  "image": "...",
  "offers": {
    "price": "...",
    "priceCurrency": "VND",
    "availability": "InStock"
  }
}
```

#### Breadcrumb Schema
Navigation path in search results

#### Collection Schema
Category/collection page listings

### 5. **Multi-Language & Multi-Region Support**

- **Default locale**: vi-VN (Vietnamese)
- **Supported locales**: vi-VN, en-US, th-TH, id-ID
- Hreflang tags for alternate language versions
- Canonical URLs to prevent duplicate content

### 6. **Open Graph & Social Sharing**

Every page includes:
- OG title, description, image
- Twitter Card metadata
- Locale-specific tags
- Dynamic product images for product pages
- Fallback to default OG image

## 📋 TODO: Additional Configuration Needed

### 1. **Environment Variables**
Add to `.env.local`:
```bash
NEXT_PUBLIC_SITE_URL=https://onlyperf.com
```

### 2. **Update Business Information**
Edit `src/lib/seo/config.ts`:
- Organization address
- Contact email
- Phone number
- Social media URLs
- Twitter handle

### 3. **Create OG Images**
Add default Open Graph image:
- `/public/images/og-default.jpg` (1200x630px)
- `/public/images/logo.png`

### 4. **Search Console Verification**
Update verification codes in `src/app/layout.tsx`:
- Google Search Console
- Bing Webmaster Tools (optional)
- Yandex (optional)

### 5. **PWA Icons**
Add required icons to `/public/favicons/`:
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

## 🚀 Testing Your SEO

### 1. **Local Testing**
```bash
npm run build
npm start
```

Visit:
- http://localhost:3000/sitemap.xml
- http://localhost:3000/robots.txt
- Check page source for meta tags

### 2. **Google Testing Tools**
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [PageSpeed Insights](https://pagespeed.web.dev/)

### 3. **Validate Structured Data**
- View page source
- Copy JSON-LD script content
- Paste in [Schema.org Validator](https://validator.schema.org/)

## 📊 Expected SEO Improvements

### Rich Search Results
- ✅ Product cards with price and availability
- ✅ Breadcrumb navigation in SERPs
- ✅ Site search box in Google
- ✅ Organization Knowledge Panel

### Social Media
- ✅ Rich previews on Facebook, Twitter, LinkedIn
- ✅ Product images when sharing product pages

### Technical SEO
- ✅ Proper canonical URLs
- ✅ Multi-language support
- ✅ Crawl optimization
- ✅ Mobile-friendly
- ✅ PWA-ready

## 🔍 SEO Best Practices Implemented

1. **Semantic HTML**: Proper heading hierarchy (h1, h2, etc.)
2. **Alt Text**: Product images have descriptive alt text
3. **Mobile-First**: Responsive viewport configuration
4. **Performance**: Static generation for SEO-critical pages
5. **Accessibility**: Proper ARIA labels and semantic markup
6. **URL Structure**: Clean, descriptive URLs
7. **Internal Linking**: Breadcrumbs and related products

## 📈 Next Steps for SEO Growth

1. **Content Marketing**:
   - Blog posts about sportswear, fitness tips
   - Product guides and comparisons
   - User-generated content (reviews)

2. **Link Building**:
   - Partner with fitness influencers
   - Guest posts on sports blogs
   - Local business directories

3. **Analytics Setup**:
   - Google Analytics 4
   - Google Search Console
   - Track conversions and user behavior

4. **Performance Optimization**:
   - Image optimization (WebP format)
   - Lazy loading
   - CDN for static assets

5. **User Experience**:
   - Product reviews/ratings (add to schema)
   - FAQ sections for products
   - Size guides and fit recommendations

## 🛠️ Maintenance

- **Monthly**: Check Google Search Console for issues
- **Quarterly**: Update product descriptions and metadata
- **Yearly**: Review and update structured data schemas
- **Ongoing**: Monitor Core Web Vitals

## 📚 Resources

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
