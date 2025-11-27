# Shopify Setup Documentation

This folder contains guides for configuring Shopify metafields and custom data to make your OnlyPerf store content manageable directly from Shopify Admin.

## Available Guides

### 1. [Announcement Bar Metafields](./announcement-bar-metafields.md)
Learn how to set up Shop metafields to make the site-wide announcement bar editable from Shopify Admin without code changes.

**What you'll learn:**
- Creating Shop-level metafield definitions
- Editing announcement content from Shopify Admin
- Enabling/disabling the banner with a toggle

---

## Coming Soon

### 2. Homepage Promo Banners Metafields (Planned)
Configure custom promo banners for the homepage using Page or Collection metafields.

### 3. Product Custom Fields (Planned)
Add custom product attributes like size charts, care instructions, or sustainability badges.

---

## What are Metafields?

Metafields are Shopify's way of storing custom data beyond the standard fields. They allow you to:
- Add custom content to products, collections, pages, orders, customers, and shop
- Display custom information on your storefront
- Manage content without touching code

### Official Documentation
- [Shopify Metafields Guide](https://help.shopify.com/en/manual/custom-data/metafields)
- [Metafield Types Reference](https://help.shopify.com/en/manual/custom-data/metafields/metafield-definitions/metafield-types)

---

## Why Use Metafields?

**Before:** Hardcoded content in code → Need developer + deployment to change

**After:** Metafields in Shopify Admin → Edit anytime, changes instant

### Benefits
✅ **Customer-managed** - No developer needed for content updates  
✅ **Instant updates** - Changes appear immediately  
✅ **Free** - Native Shopify feature on all plans  
✅ **SEO-friendly** - Server-side rendered  
✅ **Type-safe** - Defined schemas prevent errors  

---

## General Setup Process

1. **Define metafields** in Shopify Admin (Settings > Custom data)
2. **Add values** to your metafields
3. **Deploy code** that fetches the metafields (one-time)
4. **Edit anytime** from Shopify Admin going forward

---

## Need Help?

If you encounter issues or have questions:
1. Check the specific guide for troubleshooting steps
2. Refer to [Shopify's official documentation](https://help.shopify.com/en/manual/custom-data/metafields)
3. Contact your developer for technical implementation questions
