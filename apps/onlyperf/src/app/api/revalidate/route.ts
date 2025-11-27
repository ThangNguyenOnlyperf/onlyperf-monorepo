import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * On-Demand Revalidation API Route
 *
 * Allows external services (like Shopify webhooks) to trigger cache invalidation
 * immediately instead of waiting for the ISR revalidation period.
 *
 * Security: Requires REVALIDATE_SECRET token in Authorization header
 *
 * @example
 * ```bash
 * # Revalidate homepage
 * curl -X POST https://onlyperf.com/api/revalidate \
 *   -H "Authorization: Bearer YOUR_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"path": "/"}'
 *
 * # Revalidate specific cache tags
 * curl -X POST https://onlyperf.com/api/revalidate \
 *   -H "Authorization: Bearer YOUR_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"tags": ["homepage", "homepage-hero"]}'
 *
 * # Revalidate product page
 * curl -X POST https://onlyperf.com/api/revalidate \
 *   -H "Authorization: Bearer YOUR_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"path": "/products/nike-air-max"}'
 * ```
 *
 * Usage with Shopify Webhooks:
 * 1. Set REVALIDATE_SECRET in environment variables
 * 2. Create webhook in Shopify Admin: Settings > Notifications > Webhooks
 * 3. Configure webhook to POST to: https://onlyperf.com/api/revalidate
 * 4. Add Authorization header: Bearer YOUR_SECRET
 * 5. Map webhook events to paths/tags:
 *    - products/update -> path: /products/[handle]
 *    - collections/update -> tags: ["homepage", "homepage-rails"]
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const secret = process.env.REVALIDATE_SECRET;

    if (!secret) {
      console.error("[Revalidate] REVALIDATE_SECRET not configured");
      return NextResponse.json(
        { error: "Revalidation not configured" },
        { status: 500 },
      );
    }

    if (!token || token !== secret) {
      console.warn("[Revalidate] Unauthorized attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { path, paths, tag, tags } = body;

    // 3. Validate request
    if (!path && !paths && !tag && !tags) {
      return NextResponse.json(
        {
          error: "Must provide at least one of: path, paths, tag, or tags",
          example: {
            path: "/",
            paths: ["/", "/collections"],
            tag: "homepage",
            tags: ["homepage", "homepage-hero"],
          },
        },
        { status: 400 },
      );
    }

    const revalidated: string[] = [];

    // 4. Revalidate paths
    if (path) {
      revalidatePath(path);
      revalidated.push(`path:${path}`);
      console.log(`[Revalidate] Revalidated path: ${path}`);
    }

    if (paths && Array.isArray(paths)) {
      for (const p of paths) {
        revalidatePath(p);
        revalidated.push(`path:${p}`);
        console.log(`[Revalidate] Revalidated path: ${p}`);
      }
    }

    // 5. Revalidate tags
    if (tag) {
      revalidateTag(tag);
      revalidated.push(`tag:${tag}`);
      console.log(`[Revalidate] Revalidated tag: ${tag}`);
    }

    if (tags && Array.isArray(tags)) {
      for (const t of tags) {
        revalidateTag(t);
        revalidated.push(`tag:${t}`);
        console.log(`[Revalidate] Revalidated tag: ${t}`);
      }
    }

    return NextResponse.json({
      success: true,
      revalidated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Revalidate] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler for testing/health check
 * Returns available cache tags and example usage
 */
export async function GET() {
  return NextResponse.json({
    message: "On-Demand Revalidation API",
    usage: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_REVALIDATE_SECRET",
      },
      body: {
        path: "string (optional) - Single path to revalidate",
        paths: "string[] (optional) - Multiple paths to revalidate",
        tag: "string (optional) - Single cache tag to revalidate",
        tags: "string[] (optional) - Multiple cache tags to revalidate",
      },
    },
    examples: {
      revalidateHomepage: {
        path: "/",
      },
      revalidateMultiplePaths: {
        paths: ["/", "/collections", "/products/nike-air-max"],
      },
      revalidateHomepageTags: {
        tags: ["homepage", "homepage-hero", "homepage-rails"],
      },
      revalidateAnnouncementBar: {
        tags: ["announcement-bar"],
      },
    },
    availableTags: [
      "homepage",
      "homepage-hero",
      "homepage-rails",
      "homepage-discovery",
      "announcement-bar",
    ],
    documentation:
      "https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration#on-demand-revalidation",
  });
}
