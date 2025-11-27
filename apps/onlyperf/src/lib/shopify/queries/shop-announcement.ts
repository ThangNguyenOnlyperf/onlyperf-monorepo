/**
 * GraphQL query to fetch shop-level metafields for the announcement bar
 */
export const SHOP_ANNOUNCEMENT_QUERY = `
  query GetShopAnnouncementBar {
    shop {
      enabled: metafield(namespace: "announcement_bar", key: "enabled") {
        value
      }
      message: metafield(namespace: "announcement_bar", key: "message") {
        value
      }
      ctaText: metafield(namespace: "announcement_bar", key: "cta_text") {
        value
      }
      ctaUrl: metafield(namespace: "announcement_bar", key: "cta_url") {
        value
      }
    }
  }
`;
