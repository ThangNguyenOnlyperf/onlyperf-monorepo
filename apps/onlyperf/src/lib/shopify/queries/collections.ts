export const COLLECTIONS_QUERY = `#graphql
  query CollectionsList {
    collections(first: 100) {
      edges {
        node {
          id
          title
          handle
          description
          image {
            url(transform: { maxWidth: 250, maxHeight: 340, preferredContentType: WEBP })
            altText
          }
          type: metafield(namespace: "custom", key: "type") {
            value
          }
        }
      }
    }
  }
`;

export const COLLECTION_BY_HANDLE_PRODUCTS_QUERY = `#graphql
  query CollectionByHandleProducts(
    $handle: String!
    $first: Int!
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean!
  ) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      image {
        url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
        altText
      }
      type: metafield(namespace: "custom", key: "type") {
        value
      }
      products(first: $first, sortKey: $sortKey, reverse: $reverse) {
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
            variants(first: 50) {
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
  }
`;

export const LOCALIZATION_QUERY = `#graphql
  query LocalizationQuery {
    localization {
      country {
        isoCode
        name
        currency {
          isoCode
          name
          symbol
        }
      }
      language {
        isoCode
        name
        endonymName
      }
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          name
          symbol
        }
        availableLanguages {
          isoCode
          name
          endonymName
        }
      }
    }
  }
`;
