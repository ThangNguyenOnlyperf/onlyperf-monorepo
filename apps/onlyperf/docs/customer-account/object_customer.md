---
title: Customer - Customer API
description: Represents the personal information of a customer. Apps using the Customer Account API must meet the protected customer data [requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).
api_version: 2025-04
api_name: customer
type: object
api_type: graphql
source_url:
  html: https://shopify.dev/docs/api/customer/2025-04/objects/customer
  md: https://shopify.dev/docs/api/customer/2025-04/objects/customer.md
---

# Customer

object

Represents the personal information of a customer. Apps using the Customer Account API must meet the protected customer data [requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).

## Fields

* addresses

  [Customer​Address​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/CustomerAddressConnection)

  non-null

  The addresses associated with the customer.

* company​Contacts

  [Company​Contact​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/CompanyContactConnection)

  non-null

  The list of contacts the customer is associated with.

* creation​Date

  [Date​Time!](https://shopify.dev/docs/api/customer/2025-04/scalars/DateTime)

  non-null

  The date and time when the customer was created.

* default​Address

  [Customer​Address](https://shopify.dev/docs/api/customer/2025-04/objects/CustomerAddress)

  The default address of the customer.

* display​Name

  [String!](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  non-null

  The full name of the customer, based on the first\_name and last\_name values. If these aren't available, it falls back to the customer's email address, and if that isn't available, the customer's phone number.

* draft​Orders

  [Draft​Order​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/DraftOrderConnection)

  non-null

  The Draft Orders associated with the customer.

* email​Address

  [Customer​Email​Address](https://shopify.dev/docs/api/customer/2025-04/objects/CustomerEmailAddress)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The email address of the customer.

* first​Name

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  The first name of the customer.

* id

  [ID!](https://shopify.dev/docs/api/customer/2025-04/scalars/ID)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A globally-unique ID.

* image​Url

  [URL!](https://shopify.dev/docs/api/customer/2025-04/scalars/URL)

  non-null

  The URL to the avatar image of the customer.

* last​Incomplete​Checkout

  [Checkout](https://shopify.dev/docs/api/customer/2025-04/objects/Checkout)

  The customer's most recently updated, incomplete checkout.

* last​Name

  [String](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  The last name of the customer.

* metafield

  [Metafield](https://shopify.dev/docs/api/customer/2025-04/objects/Metafield)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A metafield found by namespace and key.

* metafields

  [\[Metafield\]!](https://shopify.dev/docs/api/customer/2025-04/objects/Metafield)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The metafields associated with the resource matching the supplied list of namespaces and keys.

* orders

  [Order​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/OrderConnection)

  non-null

  The orders associated with the customer.

* phone​Number

  [Customer​Phone​Number](https://shopify.dev/docs/api/customer/2025-04/objects/CustomerPhoneNumber)

  [Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  The phone number of the customer.

* store​Credit​Accounts

  [Store​Credit​Account​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/StoreCreditAccountConnection)

  non-null[Pre-auth accessible](https://shopify.dev/docs/apps/build/customer-accounts/order-status-page#customer-account-api)

  A list of the owner resource's store credit accounts. Store credit accounts are not shown for shops with store credit disabled at checkout.

* subscription​Contract

  [Subscription​Contract](https://shopify.dev/docs/api/customer/2025-04/objects/SubscriptionContract)

  Returns a `SubscriptionContract` resource by ID.

* subscription​Contracts

  [Subscription​Contract​Connection!](https://shopify.dev/docs/api/customer/2025-04/connections/SubscriptionContractConnection)

  non-null

  The Subscription Contracts associated with the customer.

* tags

  [\[String!\]!](https://shopify.dev/docs/api/customer/2025-04/scalars/String)

  non-null

  A comma-separated list of tags that have been added to the customer.

***

## Map

### Fields with this object

* {}[CompanyContact.customer](https://shopify.dev/docs/api/customer/2025-04/objects/CompanyContact#field-CompanyContact.fields.customer)
* {}[DraftOrder.customer](https://shopify.dev/docs/api/customer/2025-04/objects/DraftOrder#field-DraftOrder.fields.customer)
* {}[Order.customer](https://shopify.dev/docs/api/customer/2025-04/objects/Order#field-Order.fields.customer)

### Possible type in

* [Purchasing​Entity](https://shopify.dev/docs/api/customer/2025-04/unions/PurchasingEntity)

***

## Queries

* [customer](https://shopify.dev/docs/api/customer/2025-04/queries/customer)

  query

  Returns the Customer resource. Apps using the Customer Account API must meet the protected customer data [requirements](https://shopify.dev/docs/apps/launch/protected-customer-data).

***

## \<?>Customer Queries

### Queried by

* \<?>[customer](https://shopify.dev/docs/api/customer/2025-04/queries/customer)

***

## Mutations

* [customer​Update](https://shopify.dev/docs/api/customer/2025-04/mutations/customerUpdate)

  mutation

  Updates the customer's personal information.

***

## <\~> Customer Mutations

### Mutated by

* <\~>[customer​Update](https://shopify.dev/docs/api/customer/2025-04/mutations/customerUpdate)

***

## Interfaces

* * [Has​Metafields](https://shopify.dev/docs/api/customer/2025-04/interfaces/HasMetafields)

    interface

  * [Has​Store​Credit​Accounts](https://shopify.dev/docs/api/customer/2025-04/interfaces/HasStoreCreditAccounts)

    interface

  * [Node](https://shopify.dev/docs/api/customer/2025-04/interfaces/Node)

    interface

***

## ||-Customer Implements

### Implements

* ||-[Has​Metafields](https://shopify.dev/docs/api/customer/2025-04/interfaces/HasMetafields)
* ||-[Has​Store​Credit​Accounts](https://shopify.dev/docs/api/customer/2025-04/interfaces/HasStoreCreditAccounts)
* ||-[Node](https://shopify.dev/docs/api/customer/2025-04/interfaces/Node)