#!/usr/bin/env tsx

import 'dotenv/config';
import { typesenseClient, checkCollectionExists } from '../src/lib/typesense';
import { ALL_SCHEMAS } from '../src/lib/typesense-schemas';

async function initializeTypesense() {
  console.log('🚀 Initializing Typesense collections...\n');
  
  // Debug: Log connection details (without exposing API key)
  console.log('📡 Typesense connection details:');
  console.log(`   Host: ${process.env.TYPESENSE_HOST}`);
  console.log(`   Port: ${process.env.TYPESENSE_PORT}`);
  console.log(`   Protocol: ${process.env.TYPESENSE_PROTOCOL}`);
  console.log(`   API Key: ${process.env.TYPESENSE_API_KEY ? '***' + process.env.TYPESENSE_API_KEY.slice(-4) : 'NOT SET'}\n`);

  try {
    // Check Typesense health
    const health = await typesenseClient.health.retrieve();
    if (!health.ok) {
      throw new Error('Typesense server is not healthy');
    }
    console.log('✅ Typesense server is healthy\n');

    // Create or update collections
    for (const schema of ALL_SCHEMAS) {
      const collectionName = schema.name;
      console.log(`📦 Processing collection: ${collectionName}`);

      try {
        // Try to retrieve the collection
        try {
          await typesenseClient.collections(collectionName).retrieve();
          console.log(`   ⚠️  Collection already exists. Deleting and recreating...`);
          await typesenseClient.collections(collectionName).delete();
        } catch (error: any) {
          // Check the error more carefully
          console.log(`   Collection check error - httpStatus: ${error?.httpStatus}, name: ${error?.name}`);
          
          // If it's an ObjectNotFound error or 404, collection doesn't exist, which is fine
          if (error?.name === 'ObjectNotFound' || error?.httpStatus === 404 || error?.message?.includes('404')) {
            console.log(`   ℹ️  Collection does not exist, creating new...`);
          } else {
            throw error;
          }
        }

        console.log(`   📝 Creating collection with schema:`, JSON.stringify(schema, null, 2));
        await typesenseClient.collections().create(schema);
        console.log(`   ✅ Collection created successfully\n`);
      } catch (error: any) {
        console.error(`   ❌ Error creating collection ${collectionName}:`, error.message);
        console.error(`   Error details:`, {
          name: error?.name,
          httpStatus: error?.httpStatus,
          httpBody: error?.httpBody,
          stack: error?.stack
        });
        process.exit(1);
      }
    }

    // Retrieve and display collection info
    console.log('📊 Collection Summary:\n');
    const collections = await typesenseClient.collections().retrieve();
    
    for (const collection of collections) {
      console.log(`Collection: ${collection.name}`);
      console.log(`  - Fields: ${(collection as any).num_fields || 'N/A'}`);
      console.log(`  - Documents: ${(collection as any).num_documents || 0}`);
      console.log(`  - Default sorting: ${collection.default_sorting_field}\n`);
    }

    console.log('✨ Typesense initialization completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run data synchronization to populate collections');
    console.log('2. Test search functionality with sample queries');
    console.log('3. Monitor collection health and performance\n');

  } catch (error) {
    console.error('❌ Failed to initialize Typesense:', error);
    process.exit(1);
  }
}

// Run initialization
initializeTypesense().catch(console.error);