export const CART_FOR_SEPAY_CHECKOUT_QUERY = /* GraphQL */ `
  query CartForSepayCheckout($id: ID!) {
    cart(id: $id) {
      id
      totalQuantity
      cost {
        subtotalAmount {
          amount
          currencyCode
        }
        totalAmount {
          amount
          currencyCode
        }
      }
      buyerIdentity {
        email
      }
      lines(first: 100) {
        edges {
          node {
            quantity
            merchandise {
              __typename
              ... on ProductVariant {
                id
                title
                sku
                price {
                  amount
                  currencyCode
                }
                product {
                  title
                  vendor
                }
              }
            }
          }
        }
      }
    }
  }
`;
