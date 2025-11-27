# OnlyPerf

A modern e-commerce storefront built with Next.js 15 and Shopify Storefront API, featuring OAuth customer authentication and a high-performance shopping experience.

## Tech Stack

- **Next.js 15** with App Router and Turbopack
- **React 19** with Server Components
- **TypeScript** for type safety
- **Zod** for schema validation and type inference (preferred approach)
- **Tailwind CSS 4** for styling
- **Shopify Storefront API** for product data
- **Shopify Customer Account API** for OAuth authentication
- **Radix UI** for accessible components
- **Biome** for linting and formatting

## Features

- Product listing with filters and search
- Product detail pages with variant selection
- Shopping cart with Shopify integration
- OAuth 2.0 customer authentication
- Customer account management
- Responsive homepage with hero carousel, product rails, and promo banners
- Server-side rendering for optimal performance

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- A Shopify store with appropriate API access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd onlyperf
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables (see [Shopify Setup](#shopify-setup) below):
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
pnpm build
pnpm start
```

## Shopify Setup

### 1. Create a Shopify Store

If you don't have one already, create a Shopify store at [shopify.com](https://shopify.com).

### 2. Enable API Access

#### Storefront API (Public)

1. Go to **Settings > Apps and sales channels > Develop apps**
2. Click **Create an app** (e.g., "OnlyPerf Storefront")
3. Go to **Configuration > Storefront API**
4. Enable the following scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_read_product_tags`
   - `unauthenticated_read_collection_listings`
5. Click **Save** and then **Install app**
6. Copy the **Storefront API access token**

#### Admin API (Private)

1. In the same app, go to **Configuration > Admin API**
2. Enable the following scopes:
   - `read_products`
   - `read_customers`
   - `write_customers`
3. Copy the **Admin API access token**

#### Customer Account API (OAuth)

1. Go to **Settings > Customer accounts**
2. Enable **New customer accounts**
3. Go to **Settings > Apps and sales channels > Customer Account API**
4. Create a new application:
   - **Redirect URI**: `http://localhost:3000/api/customer-auth/callback` (update for production)
5. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Create `.env.local` with the following:

```bash
# Store configuration
NEXT_PUBLIC_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"

# Storefront API (public token)
PUBLIC_STOREFRONT_API_TOKEN="your-public-storefront-token"
SHOPIFY_STOREFRONT_API_ACCESS_TOKEN="your-storefront-api-token"
SHOPIFY_PRIVATE_STOREFRONT_API_TOKEN="your-private-storefront-token"

# Admin API
SHOPIFY_ADMIN_API_ACCESS_TOKEN="your-admin-api-token"
SHOPIFY_API_VERSION="2025-04"

# Collections (handles for homepage)
SHOPIFY_FEATURED_COLLECTION_HANDLE="homepage-featured"
SHOPIFY_BEST_SELLERS_COLLECTION_HANDLE="best-sellers"

# Homepage Metaobject Configuration (optional - defaults provided)
SHOPIFY_HOME_METAOBJECT_TYPE="home_page"
SHOPIFY_HOME_METAOBJECT_HANDLE="home-page"

# Customer Account API (OAuth)
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID="your-client-id"
SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET="your-client-secret"
SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI="http://localhost:3000/api/customer-auth/callback"
SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL="https://shopify.com/authentication/{shop-id}/oauth/authorize"
SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL="https://shopify.com/authentication/{shop-id}/oauth/token"
SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL="https://shopify.com/authentication/{shop-id}/logout"
SHOPIFY_CUSTOMER_ACCOUNT_GRAPHQL_URL="https://your-store.myshopify.com/customer/api/graphql"
```

Replace `{shop-id}` with your store's numeric ID (found in Shopify admin URL or Customer Account API settings).

### 4. Create Homepage Metaobject (CMS-Driven Content)

The homepage content is managed through a Shopify metaobject that provides a CMS-like interface for non-technical users to update homepage sections without code changes.

#### Step 1: Create Metaobject Definition

1. Go to **Settings > Custom data > Metaobjects**
2. Click **Add definition**
3. **Type**: `home_page` (or use your custom type from env vars)
4. **Name**: "Home Page"
5. Add the following fields:

   - **hero** (Collection reference, single)
     - Used for hero carousel slides (first 3 products)

   - **product_rail** (Collection reference list, max 10)
     - Each collection becomes a product rail tab

   - **categories** (Collection reference list, max 10)
     - Collections displayed as category cards

   - **discovery** (File reference list, max 10)
     - Image banners for the discovery section

   - **community** (File reference list, max 20)
     - Gallery images for the community section

6. Click **Save**

#### Step 2: Create Metaobject Entry

1. In **Custom data > Metaobjects > Home Page**, click **Add entry**
2. **Handle**: `home-page` (or use your custom handle from env vars)
3. Configure each field:
   - **hero**: Select a collection with 3+ products
   - **product_rail**: Add 2-4 collections (e.g., "New Arrivals", "Best Sellers")
   - **categories**: Add 3-6 collections to feature
   - **discovery**: Upload 2-3 banner images
   - **community**: Upload 8-12 gallery images
4. Click **Save**

#### Legacy Field Support

For backward compatibility during migrations, the system also supports these legacy field names:
- `productRailLegacy` → `product_rail`
- `communityLegacy` → `community`

These will be removed in a future version. Please use the standard field names above.

### 5. Create Required Collections (Optional - for metaobject references)

While the metaobject approach is now primary, you may want to create these collections for reference:

#### Collection: `homepage-featured` (Hero Collection)

1. Go to **Products > Collections**
2. Click **Create collection**
3. **Title**: "Homepage Featured" or "New Arrivals"
4. **Handle**: `homepage-featured` (important!)
5. Add 6+ products (preferably your newest or featured items)

**Used for:**
- Hero carousel (first 3 products when referenced in metaobject)

#### Collection: `best-sellers` (Product Rail)

1. Create another collection
2. **Title**: "Best Sellers"
3. **Handle**: `best-sellers` (important!)
4. Add 8+ products (your top-selling or popular items)

**Used for:**
- Product rail tabs when referenced in metaobject

### 6. Test the Integration

1. Restart your dev server: `pnpm dev`
2. Visit `http://localhost:3000`
3. You should see:
   - Products in the homepage carousel and product rails
   - Working product listing at `/collections`
   - Individual product pages at `/products/{handle}`
   - Login/signup functionality

## Project Structure

```
src/
├── app/                      # Next.js app router pages
│   ├── account/             # Customer account page
│   ├── api/                 # API routes (OAuth callbacks)
│   ├── login/               # Login page
│   ├── logout/              # Logout handler
│   ├── products/            # Product listing and detail pages
│   ├── signup/              # Signup page
│   └── page.tsx             # Homepage
├── components/              # React components
│   ├── home/               # Homepage-specific components
│   └── ui/                 # Reusable UI components (Radix)
└── lib/
    └── shopify/            # Shopify API integration
        ├── client.ts       # Storefront API client
        ├── customer-account.ts    # Customer Account API
        ├── customer-account-api.ts # OAuth implementation
        ├── homepage.ts     # Homepage data fetching
        ├── products.ts     # Product queries
        ├── queries/        # GraphQL queries
        └── mappers/        # Data transformation
```

## Development Practices

### Type Safety with Zod

This project follows a **Zod-first approach** for type safety:

1. **Define schemas first** - All data structures should be defined as Zod schemas
2. **Infer types from schemas** - Use `z.infer<typeof schema>` instead of manual TypeScript interfaces
3. **Single source of truth** - Zod schemas are the authoritative source for type definitions
4. **Validation at boundaries** - Validate external data (API responses, form inputs, etc.) with Zod schemas

**Example:**
```typescript
// Define schema
const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
});

// Infer type (don't define manually)
type User = z.infer<typeof userSchema>;

// Use for validation
const user = userSchema.parse(dataFromAPI);
```

Schemas are organized in `src/lib/shopify/schemas/` by domain for better maintainability.

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run Biome linter
- `pnpm format` - Format code with Biome

## Deployment

### Production Environment Variables

When deploying, update these variables:

```bash
# Use your production domain
SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI="https://yourdomain.com/api/customer-auth/callback"
```

### Deploying to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables from `.env.local`
4. Update the OAuth redirect URI in Shopify settings to match your production URL
5. Deploy

### Deploying to Other Platforms

Ensure your platform supports:
- Node.js 20+
- Server-side rendering
- Environment variables
- HTTPS (required for OAuth)

## Troubleshooting

### "No products found"

- Check that products are published and active
- Verify Storefront API tokens have correct permissions
- Check that collections exist with correct handles

### OAuth login not working

- Verify all Customer Account API environment variables
- Check redirect URI matches exactly (including protocol and trailing slashes)
- Ensure "New customer accounts" is enabled in Shopify settings

### Products not showing in collections

- Verify collection handles match environment variables exactly
- Check products are added to collections
- Ensure collections are published

## License

Private project - All rights reserved
