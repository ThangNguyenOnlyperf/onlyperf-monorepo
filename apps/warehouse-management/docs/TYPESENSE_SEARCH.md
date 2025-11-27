# Typesense Search Implementation Guide

This guide covers the Typesense search functionality integrated into the Warehouse Management System.

## Overview

The system uses Typesense as a high-performance search engine optimized for Vietnamese language support. It provides:

- **Global search** via Command+K shortcut
- **Context-specific search** on individual pages (Shipments, Storage, Products)
- **Real-time search** with sub-50ms response times
- **Vietnamese language support** with diacritic handling
- **Faceted filtering** for advanced search refinement

## Setup

### 1. VPS Deployment

Deploy Typesense on your VPS using the provided script:

```bash
# Copy the deployment script to your VPS
scp scripts/deploy-typesense.sh user@your-vps:/tmp/

# SSH into your VPS and run the script
ssh user@your-vps
sudo bash /tmp/deploy-typesense.sh
```

The script will:
- Install Typesense server
- Configure SSL with Let's Encrypt
- Set up Nginx reverse proxy
- Configure CORS for Vercel deployment
- Generate an API key (save this!)

### 2. Environment Configuration

Add these variables to your `.env.local`:

```env
# Typesense Configuration
TYPESENSE_HOST="search.yourdomain.com"  # Your VPS domain
TYPESENSE_PORT="443"
TYPESENSE_PROTOCOL="https"
TYPESENSE_API_KEY="your-api-key-from-deployment"
```

### 3. Initialize Collections

After deploying Typesense, initialize the collections:

```bash
# Initialize Typesense collections
pnpm tsx scripts/init-typesense.ts

# Sync existing data from PostgreSQL
pnpm tsx scripts/sync-typesense.ts
```

## Usage

### Global Search (Command+K)

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere in the app to open global search.

Features:
- Search across all entities (products, shipments, storage)
- Results grouped by type
- Keyboard navigation
- Direct navigation to item details

### Page-Specific Search

Each main page has its own search component with specialized features:

#### Shipments Search
- Search by receipt number, supplier name
- Filter by date range
- Filter by status (pending, received, completed)
- Faceted supplier filtering

#### Storage Search
- Search by storage name, location
- Filter by minimum capacity
- Filter by maximum utilization rate
- Priority-based filtering

#### Products Search
- Search by product name, brand, model
- QR code instant lookup
- Hierarchical brand → model filtering
- Category-based filtering

## Architecture

### Collections Structure

```typescript
// Products Collection
{
  id: string
  name: string
  brand: string (facet)
  model: string (facet)
  category: string (facet)
  qr_code: string
  created_at: int64
}

// Shipments Collection
{
  id: string
  receipt_number: string
  supplier_name: string (facet)
  status: string (facet)
  receipt_date: int64
  item_count: int32
}

// Storage Collection
{
  id: string
  name: string
  location: string (facet)
  capacity: int32
  utilization_rate: float
  priority: int32 (facet)
}
```

### Data Synchronization

The system maintains data consistency between PostgreSQL and Typesense through:

1. **Event-driven sync**: Updates Typesense whenever data changes in PostgreSQL
2. **Periodic sync**: Scheduled incremental sync for reliability
3. **Full sync**: Manual sync option for data recovery

```bash
# Incremental sync (last 5 minutes)
pnpm tsx scripts/sync-typesense.ts incremental

# Full sync
pnpm tsx scripts/sync-typesense.ts full
```

### Integration Points

1. **Server Actions**: All search operations go through server actions for security
2. **Sync Service**: Automatic sync when creating/updating entities
3. **Search Components**: Reusable UI components for consistent UX
4. **Hooks**: Custom hooks for search state management

## Vietnamese Language Optimization

The search is optimized for Vietnamese with:

- **Typo tolerance**: Handles common diacritic mistakes
- **Token handling**: Proper word segmentation
- **Fuzzy matching**: Accounts for input method variations

Example configuration:
```typescript
{
  num_typos: 2,
  typo_tokens_threshold: 1,
  drop_tokens_threshold: 1,
  split_join_tokens: 'always'
}
```

## Performance

Expected performance metrics:

- **Search latency**: 5-50ms
- **Indexing speed**: <100ms per document
- **Concurrent searches**: 1000+ RPS
- **Data freshness**: <1 second

## Monitoring

Monitor Typesense health:

```bash
# Check service status
systemctl status typesense

# View logs
journalctl -u typesense -f

# Check health endpoint
curl https://search.yourdomain.com/health \
  -H "X-TYPESENSE-API-KEY: your-api-key"
```

## Troubleshooting

### Common Issues

1. **Search not working**
   - Check Typesense health endpoint
   - Verify API key in environment variables
   - Check CORS configuration

2. **Data not syncing**
   - Run manual sync: `pnpm tsx scripts/sync-typesense.ts`
   - Check PostgreSQL connection
   - Verify collection schemas match

3. **Slow search**
   - Check Typesense server resources
   - Verify network latency
   - Review search query complexity

### Debug Mode

Enable debug logging:

```typescript
// In src/lib/typesense.ts
logLevel: 'debug'
```

## Security

- API keys are server-side only
- All searches go through authenticated server actions
- CORS restricted to your Vercel domains
- SSL/TLS encryption for all communications

## Future Enhancements

Planned improvements:

1. **Search Analytics**: Track popular searches
2. **Synonyms**: Configure Vietnamese synonyms
3. **Geosearch**: Location-based storage search
4. **Voice Search**: Vietnamese voice input
5. **Search Suggestions**: Auto-complete functionality