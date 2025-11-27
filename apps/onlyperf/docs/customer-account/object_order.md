---
title: Order - Customer API
description: >-
  A customer’s completed request to purchase one or more products from a shop.
  Apps using the Customer Account API must meet the protected customer data
  [requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).
api_version: 2025-04
api_name: customer
type: object
api_type: graphql
source_url:
  html: 'https://shopify.dev/docs/api/customer/2025-04/objects/Order'
  md: 'https://shopify.dev/docs/api/customer/2025-04/objects/Order.md'
---

# Order

object

A customer’s completed request to purchase one or more products from a shop. Apps using the Customer Account API must meet the protected customer data [requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).

## Fields

* agreements

  [Sales​Agreement​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/SalesAgreementConnection)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A list of sales agreements associated with the order.

* billing​Address

  [Customer​Address](https://shopify.dev/docs/api/customer/2025-04/objects/CustomerAddress)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The mailing address provided by the customer. Not all orders have a mailing address.

* cancelled​At

  [Date​Time](https://shopify.dev/docs/api/customer/2025-04/scalars/DateTime)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The date and time when the order was canceled. Returns `null` if the order wasn't canceled.

* cancel​Reason

  [Order​Cancel​Reason](https://shopify.dev/docs/api/customer/2025-04/enums/OrderCancelReason)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The reason for the cancellation of the order. Returns `null` if the order wasn't canceled.

* confirmation​Number

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A randomly generated alpha-numeric identifier for the order that may be shown to the customer instead of the sequential order name. For example, "XPAV284CT", "R50KELTJP" or "35PKUN0UJ". This value isn't guaranteed to be unique.

* created​At

  [Date​Time!](https://shopify.dev/docs/api/customer/2025-04/scalars/DateTime)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The date and time when the order was created.

* currency​Code

  [Currency​Code!](https://shopify.dev/docs/api/customer/2025-04/enums/CurrencyCode)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The shop currency when the order was placed.

* customer

  [Customer](https://shopify.dev/docs/api/customer/2025-04/objects/Customer)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The customer who placed the order.

* customer​Locale

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The locale code representing the region where this specific order was placed.

* discount​Applications

  [Discount​Application​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/DiscountApplicationConnection)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The discounts that have been applied to the order.

* draft​Order

  [Draft​Order](https://shopify.dev/docs/api/customer/2025-04/objects/DraftOrder)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The draft order associated with the order.

* edited

  [Boolean!](https://shopify.dev/docs/api/customer/2025-04/scalars/Boolean)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  Whether the order has been edited or not.

* email

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The email address of the customer.

* financial​Status

  [Order​Financial​Status](https://shopify.dev/docs/api/customer/2025-04/enums/OrderFinancialStatus)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The financial status of the order.

* fulfillments

  [Fulfillment​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/FulfillmentConnection)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The fulfillments associated with the order.

* fulfillment​Status

  [Order​Fulfillment​Status!](https://shopify.dev/docs/api/customer/2025-04/enums/OrderFulfillmentStatus)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The fulfillment status of the order.

* id

  [ID!](https://shopify.dev/docs/api/customer/2025-04/scalars/ID)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A globally-unique ID.

* line​Items

  [Line​Item​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/LineItemConnection)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The list of line items of the order.

* location​Name

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The name of the fulfillment location assigned at the time of order creation.

* metafield

  [Metafield](https://shopify.dev/docs/api/customer/2025-04/objects/Metafield)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A metafield found by namespace and key.

* metafields

  [\[Metafield\]!](https://shopify.dev/docs/api/customer/2025-04/objects/Metafield)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The metafields associated with the resource matching the supplied list of namespaces and keys.

* name

  [String!](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The identifier for the order that appears on the order. For example, *#1000* or \_Store1001.

* note

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The order's notes.

* number

  [Int!](https://shopify.dev/docs/api/customer/2025-04/scalars/Int)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A unique numeric identifier for the order, used by both the shop owner and customer.

* payment​Information

  [Order​Payment​Information](https://shopify.dev/docs/api/customer/2025-04/objects/OrderPaymentInformation)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The payment information for the order.

* phone

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  The phone number of the customer for SMS notifications.

* po​Number

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The purchase order number of the order.

* processed​At

  [Date​Time!](https://shopify.dev/docs/api/customer/2025-04/scalars/DateTime)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The date and time when the order was processed. This value can be set to dates in the past when importing from other systems. If no value is provided, it will be auto-generated based on current date and time.

* purchasing​Entity

  [Purchasing​Entity](https://shopify.dev/docs/api/customer/2025-04/unions/PurchasingEntity)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The purchasing entity for the order.

* refunds

  [\[Refund!\]!](https://shopify.dev/docs/api/customer/2025-04/objects/Refund)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A list of refunds associated with the order.

* requires​Shipping

  [Boolean!](https://shopify.dev/docs/api/customer/2025-04/scalars/Boolean)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  Whether the order requires shipping.

* return​Information

  [Order​Return​Information!](https://shopify.dev/docs/api/customer/2025-04/objects/OrderReturnInformation)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The return information for the order.

* returns

  [Return​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/ReturnConnection)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The list of returns for the order with pagination.

* shipping​Address

  [Customer​Address](https://shopify.dev/docs/api/customer/2025-04/objects/CustomerAddress)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The mailing address to which the order items are shipped.

* shipping​Discount​Allocations

  [\[Discount​Allocation!\]!](https://shopify.dev/docs/api/customer/2025-04/objects/DiscountAllocation)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The discounts that have been allocated onto the shipping line by discount applications.

* shipping​Line

  [Shipping​Line](https://shopify.dev/docs/api/customer/2025-04/objects/ShippingLine)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A summary of all shipping costs on the order.

* status​Page​Url

  [URL!](https://shopify.dev/docs/api/customer/2025-04/scalars/URL)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The unique URL for the status page of the order.

* subscription​Contracts

  [Subscription​Contract​Connection](https://shopify.dev/docs/api/customer/2025-04/connections/SubscriptionContractConnection)

  The customer Subscription Contracts associated with the order.

* subtotal

  [Money​V2](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The price of the order before duties, shipping, and taxes.

* total​Duties

  [Money​V2](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The total amount of duties after returns.

* total​Price

  [Money​V2!](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The total amount of the order (including taxes and discounts) minus the amounts for line items that have been returned.

* total​Refunded

  [Money​V2!](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The total amount refunded.

* total​Shipping

  [Money​V2!](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The total cost of shipping.

* total​Tax

  [Money​V2](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The total cost of taxes.

* total​Tip

  [Money​V2](https://shopify.dev/docs/api/customer/2025-04/objects/MoneyV2)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The total value of tips.

* transactions

  [\[Order​Transaction!\]!](https://shopify.dev/docs/api/customer/2025-04/objects/OrderTransaction)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A list of transactions associated with the order.

* updated​At

  [Date​Time!](https://shopify.dev/docs/api/customer/2025-04/scalars/DateTime)

  non-null

  The date and time when the order was last updated.

***

## Map

### Fields and connections with this object

* {}[Company.orders](https://shopify.dev/docs/api/customer/2025-04/objects/Company#field-Company.fields.orders)
* {}[CompanyContact.orders](https://shopify.dev/docs/api/customer/2025-04/objects/CompanyContact#field-CompanyContact.fields.orders)
* {}[CompanyLocation.orders](https://shopify.dev/docs/api/customer/2025-04/objects/CompanyLocation#field-CompanyLocation.fields.orders)
* {}[Customer.orders](https://shopify.dev/docs/api/customer/2025-04/objects/Customer#field-Customer.fields.orders)
* {}[DraftOrder.order](https://shopify.dev/docs/api/customer/2025-04/objects/DraftOrder#field-DraftOrder.fields.order)
* {}[OrderAgreement.order](https://shopify.dev/docs/api/customer/2025-04/objects/OrderAgreement#field-OrderAgreement.fields.order)
* <->[OrderConnection.nodes](https://shopify.dev/docs/api/customer/2025-04/connections/OrderConnection#returns-nodes)
* {}[OrderEdge.node](https://shopify.dev/docs/api/customer/2025-04/objects/OrderEdge#field-OrderEdge.fields.node)
* {}[OrderTransaction.order](https://shopify.dev/docs/api/customer/2025-04/objects/OrderTransaction#field-OrderTransaction.fields.order)
* {}[SubscriptionContract.orders](https://shopify.dev/docs/api/customer/2025-04/objects/SubscriptionContract#field-SubscriptionContract.fields.orders)
* {}[SubscriptionContract.originOrder](https://shopify.dev/docs/api/customer/2025-04/objects/SubscriptionContract#field-SubscriptionContract.fields.originOrder)
* ||-[SubscriptionContractBase.orders](https://shopify.dev/docs/api/customer/2025-04/interfaces/SubscriptionContractBase#fields-orders)

***

## Queries

* [order](https://shopify.dev/docs/api/customer/2025-04/queries/order)

  query

  Returns an Order resource by ID. Apps using the Customer Account API must meet the protected customer data [requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).

***

## \<?>Order Queries

### Queried by

* \<?>[order](https://shopify.dev/docs/api/customer/2025-04/queries/order)

***

## Interfaces

* * [Has​Metafields](https://shopify.dev/docs/api/customer/2025-04/interfaces/HasMetafields)

    interface

  * [Node](https://shopify.dev/docs/api/customer/2025-04/interfaces/Node)

    interface

***

## ||-Order Implements

### Implements

* ||-[Has​Metafields](https://shopify.dev/docs/api/customer/2025-04/interfaces/HasMetafields)
* ||-[Node](https://shopify.dev/docs/api/customer/2025-04/interfaces/Node)