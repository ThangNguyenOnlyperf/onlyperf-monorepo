export const HOME_METAOBJECT_QUERY = `#graphql
  query HomeMetaobject(
    $type: String!
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $heroProductsLimit: Int = 3
    $railProductsLimit: Int = 8
  ) @inContext(country: $country, language: $language) {
    metaobject(handle: { type: $type, handle: $handle }) {
      id
      handle
      type
	      hero: field(key: "hero") {
        reference {
          __typename
          ... on Collection {
            id
            title
            handle
            image {
              url(transform: { maxWidth: 1920, maxHeight: 1080, preferredContentType: WEBP })
              altText
            }
            products(first: $heroProductsLimit, sortKey: COLLECTION_DEFAULT) {
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
                        price { amount currencyCode }
                        image {
                          url(transform: { maxWidth: 1920, maxHeight: 1080, preferredContentType: WEBP })
                          altText
                        }
                        selectedOptions { name value }
                        colorHex: metafield(namespace: "custom", key: "color_hex") { value }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      productRail: field(key: "product_rail") {
        references(first: 10) {
          nodes {
            __typename
            ... on Collection {
              id
              title
              handle
              image {
                url(transform: { maxWidth: 1024, maxHeight: 1024, preferredContentType: WEBP })
                altText
              }
              products(first: $railProductsLimit, sortKey: BEST_SELLING) {
                edges {
                  node {
                    id
                    title
                    handle
                    description
                    featuredImage {
                      url(transform: { maxWidth: 1024, maxHeight: 1024, preferredContentType: WEBP })
                      altText
                    }
                    variants(first: 20) {
                      edges {
                        node {
                          id
                          title
                          availableForSale
                          price { amount currencyCode }
                          image {
                            url(transform: { maxWidth: 1024, maxHeight: 1024, preferredContentType: WEBP })
                            altText
                          }
                          selectedOptions { name value }
                          colorHex: metafield(namespace: "custom", key: "color_hex") { value }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      categories: field(key: "categories") {
        references(first: 10) {
          nodes {
            __typename
            ... on Collection {
              id
              title
              handle
              image {
                url(transform: { maxWidth: 800, maxHeight: 800, preferredContentType: WEBP })
                altText
              }
            }
          }
        }
      }
      discovery: field(key: "discovery") {
        references(first: 10) {
          nodes {
            __typename
            ... on MediaImage {
              id
              image {
                url(transform: { maxWidth: 1920, maxHeight: 1080, preferredContentType: WEBP })
                altText
              }
              alt
            }
            ... on GenericFile {
              id
              url
              previewImage {
                url(transform: { maxWidth: 1920, maxHeight: 1080, preferredContentType: WEBP })
                altText
              }
            }
          }
        }
      }
      community: field(key: "community") {
        references(first: 20) {
          nodes {
            __typename
            ... on MediaImage {
              id
              image {
                url(transform: { maxWidth: 1280, maxHeight: 1280, preferredContentType: WEBP })
                altText
              }
              alt
            }
            ... on GenericFile {
              id
              url
              previewImage {
                url(transform: { maxWidth: 1280, maxHeight: 1280, preferredContentType: WEBP })
                altText
              }
            }
          }
        }
      }
    }
  }
`;
