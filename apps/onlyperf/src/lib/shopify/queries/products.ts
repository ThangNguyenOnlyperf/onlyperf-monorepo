export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      productType
      vendor
      tags
      featuredImage {
        url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
        altText
      }
      images(first: 20) {
        nodes {
          url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
          altText
        }
      }
      options {
        id
        name
        values
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
              url
              altText
            }
            selectedOptions {
              name
              value
            }
            colorHex: metafield(namespace: "custom", key: "color_hex") {
              value
            }
            variantImages: metafield(namespace: "custom", key: "images") {
              references(first: 10) {
                nodes {
                  ... on MediaImage {
                    image {
                      url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
                      altText
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
`;

export const PRODUCTS_QUERY = `#graphql
  query ProductsList($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
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

export const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      description
      featuredImage {
        url
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
              url
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
`;

export const PRODUCTS_WITH_SORT_QUERY = `#graphql
  query ProductsListWithSort(
    $first: Int!
    $sortKey: ProductSortKeys!
    $reverse: Boolean!
  ) {
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
`;

export const VARIANT_BY_ID_QUERY = `#graphql
  query VariantById($id: ID!) {
    node(id: $id) {
      ... on ProductVariant {
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
        variantImages: metafield(namespace: "custom", key: "images") {
          references(first: 10) {
            nodes {
              ... on MediaImage {
                image {
                  url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
                  altText
                }
              }
            }
          }
        }
        product {
          id
          title
          handle
          description
        }
      }
    }
  }
`;
