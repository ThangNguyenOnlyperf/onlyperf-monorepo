#!/bin/bash

# Migrate console.error, console.log, console.warn to Pino logger
# This script processes all remaining files that need migration

echo "Starting migration from console to Pino logger..."

# Files that need migration
FILES=(
  "src/actions/shopify/inventoryActions.ts"
  "src/lib/shopify/inventory.ts"
  "src/actions/productActions.ts"
  "src/actions/shipmentActions.ts"
  "src/actions/shipmentItemActions.ts"
  "src/actions/scanActions.ts"
  "src/actions/outboundSessionActions.ts"
  "src/actions/customerActions.ts"
  "src/actions/storageActions.ts"
  "src/actions/searchActions.ts"
  "src/lib/typesense-sync.ts"
  "src/lib/typesense.ts"
  "src/actions/brandActions.ts"
  "src/actions/colorActions.ts"
  "src/actions/providerActions.ts"
  "src/actions/deliveryActions.ts"
  "src/actions/reportActions.ts"
  "src/lib/auth-server.ts"
  "src/actions/badgeActions.ts"
  "src/lib/badge-generator.ts"
  "src/lib/pdf-templates-grouped.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Add logger import if not present
    if ! grep -q "import { logger } from '~/lib/logger'" "$file" && ! grep -q "import { logger } from \"~/lib/logger\"" "$file"; then
      # Find the last import statement and add logger import after it
      sed -i '' "/^import.*from/a\\
import { logger } from '~/lib/logger';
" "$file" 2>/dev/null || true
    fi

    # Replace console.error patterns
    sed -i '' "s/console\.error(\([^,]*\), error)/logger.error({ error }, \1)/g" "$file"
    sed -i '' "s/console\.error('\\([^']*\\)', error)/logger.error({ error }, '\\1')/g" "$file"
    sed -i '' "s/console\.error(\"\\([^\"]*\\)\", error)/logger.error({ error }, \"\\1\")/g" "$file"

    # Replace console.log patterns
    sed -i '' "s/console\.log(\([^)]*\))/logger.info(\1)/g" "$file"

    # Replace console.warn patterns
    sed -i '' "s/console\.warn(\([^)]*\))/logger.warn(\1)/g" "$file"

    # Replace console.debug patterns
    sed -i '' "s/console\.debug(\([^)]*\))/logger.debug(\1)/g" "$file"

    echo "  ✓ Migrated $file"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "Migration complete! Please review the changes."
echo "Run 'pnpm lint' to check for any issues."
