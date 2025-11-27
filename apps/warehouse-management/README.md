# Warehouse Management System

A modern warehouse management system built with Next.js, featuring QR code scanning, real-time inventory tracking, Shopify integration, and powerful search capabilities with Vietnamese language support.

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture, data flow diagrams, and technical overview
- **Route Documentation** - Detailed README files in each route directory:
  - [Setup](./src/app/setup/README.md) - Initial system setup
  - [Storages](./src/app/storages/README.md) - Warehouse location management
  - [Products](./src/app/products/README.md) - Product catalog and Shopify sync
  - [Shipments](./src/app/shipments/README.md) - Inbound shipment management
  - [Outbound](./src/app/outbound/README.md) - In-store sales and POS
  - [Fulfillment](./src/app/fulfillment/README.md) - Shopify order fulfillment
  - [Orders](./src/app/orders/README.md) - Order tracking and management
  - [Deliveries](./src/app/deliveries/README.md) - Delivery tracking and resolution

## 🚀 Features

- **QR Code Management**: Generate and scan QR codes for inventory items (format: ABCD1234)
- **Shipment Tracking**: Manage inbound shipments with detailed tracking
- **Storage Management**: Organize warehouse locations with capacity tracking
- **Point of Sale (POS)**: Multi-device synchronized outbound/sales interface
- **Shopify Integration**: Product sync, inventory sync, and order fulfillment
- **Order Management**: Track orders from multiple sources (in-store, Shopify, manual)
- **Delivery Tracking**: Comprehensive delivery management with failed delivery resolution
- **Advanced Search**: Lightning-fast search with Typesense integration
  - Global search with Command+K shortcut
  - Context-specific search on each page
  - Vietnamese language optimization
- **Real-time Updates**: Instant inventory updates and status tracking
- **Multi-language**: Full Vietnamese language support
- **Role-based Access**: Admin, Warehouse Staff, and Accountant roles

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [DrizzleORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Search**: [Typesense](https://typesense.org/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **QR Code**: qrcode & qr-scanner libraries

## 📋 Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- VPS or server for Typesense deployment (optional, for search functionality)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/warehouse-management.git
   cd warehouse-management
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/warehouse_db"
   
   # Application
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

    # Typesense (optional, for search)
    TYPESENSE_HOST="localhost"
    TYPESENSE_PORT="8108"
    TYPESENSE_PROTOCOL="http"
    TYPESENSE_API_KEY="your-typesense-api-key"

    # Authentication
    BETTER_AUTH_SECRET="your-auth-secret"
    BETTER_AUTH_URL="http://localhost:3000"

    # Shopify integration (optional add-on)
    SHOPIFY_ENABLED="true" # set to "false" to disable all Shopify syncing
    SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
    SHOPIFY_ADMIN_API_ACCESS_TOKEN="your-admin-token"
    SHOPIFY_API_VERSION="2025-04"
    SHOPIFY_LOCATION_ID="your-shopify-location-id"
  ```

4. **Set up the database**
   ```bash
   # Generate database schema
   pnpm db:generate
   
   # Push schema to database
   pnpm db:push
   
   # (Optional) Open Drizzle Studio to manage data
   pnpm db:studio
   ```

## 🔍 Typesense Search Setup

The application includes powerful search functionality powered by Typesense. This is optional but highly recommended for the best user experience.

### Option 1: VPS Deployment (Production)

1. **Deploy Typesense on your VPS**
   ```bash
   # Copy deployment script to your VPS
   scp scripts/deploy-typesense.sh user@your-vps:/tmp/
   
   # SSH into your VPS and run
   ssh user@your-vps
   sudo bash /tmp/deploy-typesense.sh
   ```
   
   The script will:
   - Install Typesense server
   - Configure SSL with Let's Encrypt
   - Set up Nginx reverse proxy
   - Generate an API key (save this!)

2. **Update production environment variables**
   ```env
   TYPESENSE_HOST="search.yourdomain.com"
   TYPESENSE_PORT="443"
   TYPESENSE_PROTOCOL="https"
   TYPESENSE_API_KEY="your-production-api-key"
   ```

### Option 2: Local Development

1. **Install Typesense locally**
   ```bash
   # Using Docker
   docker run -p 8108:8108 -v/tmp/typesense-data:/data \
     typesense/typesense:26.0 \
     --data-dir /data --api-key=xyz123
   ```

2. **Initialize Typesense collections**
   ```bash
   # Create search collections
   pnpm tsx scripts/init-typesense.ts
   
   # Sync existing data from PostgreSQL
   pnpm tsx scripts/sync-typesense.ts
   ```

### Search Features

Once configured, you'll have access to:

- **Global Search**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere
- **Shipment Search**: Search by receipt number, supplier, date range
- **Storage Search**: Find locations by name, capacity, utilization
- **Product Search**: Search by name, brand, model, or QR code
- **Vietnamese Support**: Optimized for Vietnamese diacritics and typos

## 🛒 Shopify Integration (Optional)

Shopify syncing is treated as an add-on that can be toggled per environment.

### Configuration
- Use the `SHOPIFY_ENABLED` environment variable (`"true"` by default). When set to `"false"`, the app hides Shopify UI controls and skips all Shopify API calls/background syncs.
- When enabled, provide the remaining Shopify credentials (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_API_ACCESS_TOKEN`, `SHOPIFY_LOCATION_ID`, `SHOPIFY_WEBHOOK_SECRET`, etc.).
- After changing the flag, restart the app to ensure server and client components pick up the new configuration.

### Features
- **Product Sync**: Sync warehouse products to Shopify store
- **Inventory Sync**: Real-time inventory level updates
- **Order Webhook**: Automatic order creation from Shopify sales
- **Manual Fulfillment**: QR code scanning workflow for online orders

### Workflow
1. Create product in warehouse system
2. Click "Sync to Shopify" to publish online
3. Customer buys product online → Webhook creates order
4. Staff uses `/fulfillment` page to scan items
5. Order marked as fulfilled → Delivery created

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed Shopify integration flow.

## 💻 Development

1. **Start the development server**
   ```bash
   pnpm dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

2. **Run type checking**
   ```bash
   pnpm typecheck
   ```

3. **Run linting**
   ```bash
   pnpm lint
   pnpm lint:fix  # Auto-fix issues
   ```

4. **Format code**
   ```bash
   pnpm format:check
   pnpm format:write  # Auto-format
   ```

## 📝 Available Scripts

- `pnpm dev` - Start development server with Turbo
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio GUI
- `pnpm tsx scripts/init-typesense.ts` - Initialize Typesense collections
- `pnpm tsx scripts/sync-typesense.ts` - Sync data to Typesense

## 🚀 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Deploy with Vercel**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy!

3. **Set up Typesense on VPS** (if using search)
   - Follow the VPS deployment instructions above
   - Update Vercel environment variables with production Typesense credentials

### Environment Variables for Production

Make sure to set all required environment variables in your deployment platform:

```env
DATABASE_URL=your-production-database-url
NEXT_PUBLIC_APP_URL=https://yourdomain.com
TYPESENSE_HOST=search.yourdomain.com
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your-production-api-key
BETTER_AUTH_SECRET=your-production-auth-secret
BETTER_AUTH_URL=https://yourdomain.com
```

## 📁 Project Structure

```
warehouse-management/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── search/      # Search components
│   │   └── ...          # Feature components
│   ├── server/
│   │   └── db/          # Database schema and config
│   ├── lib/             # Utility functions and libraries
│   ├── actions/         # Server actions
│   ├── hooks/           # Custom React hooks
│   └── styles/          # Global styles
├── scripts/             # Utility scripts
│   ├── deploy-typesense.sh
│   ├── init-typesense.ts
│   └── sync-typesense.ts
├── config/              # Configuration files
└── docs/               # Documentation
```

## 🔐 Authentication & Roles

The system supports three user roles:

1. **Admin**: Full system access
2. **Warehouse Staff**: Manage inventory and shipments
3. **Accountant**: View reports and financial data

## 🌏 Vietnamese Language Support

The entire system is built with Vietnamese language support:

- All UI text is in Vietnamese
- Search is optimized for Vietnamese diacritics
- Date formatting follows Vietnamese conventions
- Error messages and notifications in Vietnamese

## 🐛 Troubleshooting

### Search not working
- Check Typesense server status: `systemctl status typesense`
- Verify API key in environment variables
- Run manual sync: `pnpm tsx scripts/sync-typesense.ts`

### Database connection issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and user has permissions

### Build errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check for TypeScript errors: `pnpm typecheck`

## 📄 License

This project is licensed under the MIT License.

For issues and questions, please create an issue on GitHub.
