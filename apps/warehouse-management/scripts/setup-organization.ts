/**
 * Setup Script: Create Organization
 *
 * Usage:
 *   pnpm setup:org
 *   # or
 *   dotenv -e ../../.env -- tsx scripts/setup-organization.ts
 *
 * This script:
 * 1. Prompts for organization details (name, slug)
 * 2. Creates the organization
 * 3. Creates organization settings
 *
 * After running this script, visit /setup in the app to create the owner account.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomBytes } from "crypto";
import prompts from "prompts";
import { organization, organizationSettings } from "@perf/db/schema";

// Get database URL from env
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.log("\nRun with: pnpm setup:org");
  console.log("Or: dotenv -e ../../.env -- tsx scripts/setup-organization.ts");
  process.exit(1);
}

const conn = postgres(DATABASE_URL);
const db = drizzle(conn);

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("\n🚀 Organization Setup Wizard\n");
  console.log("This will create a new organization.\n");
  console.log("Note: After creating the organization, visit /setup in the app to create the owner account.\n");

  // Prompt for organization details
  const orgResponse = await prompts<"name" | "slug">([
    {
      type: "text",
      name: "name",
      message: "Organization name:",
      initial: "My Organization",
      validate: (value: string) => value.length > 0 || "Name is required",
    },
    {
      type: "text",
      name: "slug",
      message: "Organization slug (URL-friendly):",
      initial: (prev: string) => generateSlug(prev),
      validate: (value: string) =>
        /^[a-z0-9-]+$/.test(value) ||
        "Slug must be lowercase letters, numbers, and hyphens only",
    },
  ]);

  const orgName = orgResponse.name as string | undefined;
  const orgSlug = orgResponse.slug as string | undefined;

  if (!orgName || !orgSlug) {
    console.log("\n❌ Setup cancelled");
    process.exit(1);
  }

  console.log("\n📝 Creating organization...\n");

  try {
    // Generate IDs
    const orgId = generateId("org");
    const settingsId = generateId("settings");

    // Create organization
    console.log("1️⃣  Creating organization...");
    await db.insert(organization).values({
      id: orgId,
      name: orgName,
      slug: orgSlug,
      createdAt: new Date(),
    });
    console.log(`   ✓ Organization "${orgName}" created`);

    // Create organization settings
    console.log("2️⃣  Creating organization settings...");
    await db.insert(organizationSettings).values({
      id: settingsId,
      organizationId: orgId,
      shopifyEnabled: false,
      defaultWarrantyMonths: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("   ✓ Settings created");

    // Success!
    console.log("\n✅ Organization created!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Organization Details:");
    console.log(`  Name:  ${orgName}`);
    console.log(`  Slug:  ${orgSlug}`);
    console.log(`  ID:    ${orgId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🔐 Now visit /setup in your app to create the owner account.\n");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

// Run the script
main().catch(console.error);
