#!/usr/bin/env tsx

import { fullSync, incrementalSync } from '../src/lib/typesense-sync';
import { checkTypesenseHealth } from '../src/lib/typesense';

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';

  console.log('🔄 Typesense Data Synchronization\n');

  try {
    // Check Typesense health first
    const isHealthy = await checkTypesenseHealth();
    if (!isHealthy) {
      throw new Error('Typesense server is not healthy. Please check your connection.');
    }
    console.log('✅ Typesense server is healthy\n');

    if (mode === 'incremental') {
      const minutes = parseInt(args[1] || '5');
      console.log(`📊 Running incremental sync for changes in the last ${minutes} minutes...\n`);
      
      const results = await incrementalSync(minutes);
      
      console.log('\n✨ Incremental sync completed!');
      console.log(`   - Products synced: ${results.products}`);
      console.log(`   - Shipments synced: ${results.shipments}`);
      console.log(`   - Items synced: ${results.items}`);
      console.log(`   - Storages synced: ${results.storages}`);
    } else {
      console.log('📊 Running full sync...\n');
      await fullSync();
    }

    console.log('\n🎉 Sync completed successfully!');
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

// Show usage
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: pnpm tsx scripts/sync-typesense.ts [mode] [options]

Modes:
  full          Sync all data from PostgreSQL to Typesense (default)
  incremental   Sync only recent changes

Options:
  For incremental mode:
    [minutes]   Number of minutes to look back (default: 5)

Examples:
  pnpm tsx scripts/sync-typesense.ts              # Full sync
  pnpm tsx scripts/sync-typesense.ts full         # Full sync (explicit)
  pnpm tsx scripts/sync-typesense.ts incremental  # Incremental sync (last 5 minutes)
  pnpm tsx scripts/sync-typesense.ts incremental 30  # Incremental sync (last 30 minutes)
`);
  process.exit(0);
}

// Run the sync
main().catch(console.error);