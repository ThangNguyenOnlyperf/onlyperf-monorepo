export const HOMEPAGE_PRODUCTS_QUERY = `#graphql
  query HomepageProducts(
    $country: CountryCode
    $language: LanguageCode
    $featuredHandle: String
    $bestSellingHandle: String
    $newArrivalLimit: Int!
    $bestSellingLimit: Int!
  ) @inContext(country: $country, language: $language) {
    featuredCollection: collection(handle: $featuredHandle) {
      id
      title
      handle
      products(first: $newArrivalLimit, sortKey: COLLECTION_DEFAULT) {
        edges {
          node {
            id
            title
            handle
            description
            featuredImage {
              url(transform: { maxWidth: 1920, maxHeight: 1080, preferredContentType: WEBP })
              altText
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  image {
                    url(transform: { maxWidth: 1920, maxHeight: 1080, preferredContentType: WEBP })
                    altText
                  }
                  selectedOptions {
                    name
                    value
                  }
                  colorHex: metafield(namespace: "custom", key: "color_hex") {
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
    newArrivalsFallback: products(first: $newArrivalLimit, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          handle
          description
          featuredImage {
            url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
            altText
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                image {
                  url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
                  altText
                }
                selectedOptions {
                  name
                  value
                }
                colorHex: metafield(namespace: "custom", key: "color_hex") {
                  value
                }
              }
            }
          }
        }
      }
    }
    bestSellingCollection: collection(handle: $bestSellingHandle) {
      id
      title
      handle
      products(first: $bestSellingLimit, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            title
            handle
            description
            featuredImage {
              url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
              altText
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  image {
                    url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
                    altText
                  }
                  selectedOptions {
                    name
                    value
                  }
                  colorHex: metafield(namespace: "custom", key: "color_hex") {
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
    bestSellersFallback: products(first: $bestSellingLimit, sortKey: BEST_SELLING) {
      edges {
        node {
          id
          title
          handle
          description
          featuredImage {
            url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
            altText
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                image {
                  url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
                  altText
                }
                selectedOptions {
                  name
                  value
                }
                colorHex: metafield(namespace: "custom", key: "color_hex") {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;
