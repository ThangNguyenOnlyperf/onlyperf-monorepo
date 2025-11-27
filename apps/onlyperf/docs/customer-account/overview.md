---
title: Customer Account API reference
description: Provides access to the Customer over GraphQL.
api_version: 2025-04
api_name: customer
source_url:
  html: 'https://shopify.dev/docs/api/customer/2025-04'
  md: 'https://shopify.dev/docs/api/customer/2025-04.md'
---

# GraphQL Customer Account API

Create personalized, customer authenticated experiences with the Customer Account API. The API offers a full range of options making it possible for customers to view their orders, manage their profile and much more.

## Authentication

This guide will provide an overview of the new authentication system for the Customer Account API and help developers understand how to use it effectively.

### Overview

The Customer Account API is designed to serve as the primary source for customer-scoped data and authenticated customer actions. To ensure secure access to this data, a robust authentication system is in place for developers.

### Authentication process

We support two types of clients:

* **Confidential** - A client capable of keeping a client secret confidential. This type is typically used for server-side applications.
* **Public** - A client unable to keep a client secret confidential. This type is typically used for client-side applications, including web and mobile clients.

For **public clients**, we use [Proof Key for Code Exchange](https://datatracker.ietf.org/doc/html/rfc7636) or PKCE to mitigate the risk of authorization code interception.

In order to authenticate and utilize the Customer Account API, the sections below outline the necessary steps required by the [OAuth 2.0 authorization specification](https://datatracker.ietf.org/doc/html/rfc6749).

### Discovery endpoints

Discovery endpoints are standardized URLs that return configuration data about a shop's authentication and API endpoints. Use these endpoints whenever you need to authenticate customers or make API requests to ensure your application works with any shop's configuration.

Using discovery endpoints automatically provides authentication and API URLs rather than hardcoding URLs. This keeps your integration working as Shopify's infrastructure evolves and automatically resolves the correct URLs for any shop, removing the need for hardcoded domain dependencies.

Your app can use the following discovery endpoints on the storefront domain:

* **OpenID configuration**

  * **Endpoint**: `GET /.well-known/openid-configuration`

  * **Returns**:

    * Authentication endpoints (authorization, token, logout URLs)
    * Standard OpenID Connect discovery format

* **Customer Account API configuration**:

  * **Endpoint**: `GET /.well-known/customer-account-api`

  * **Returns**:

    * Customer Account API endpoints (GraphQL API, MCP API)
    * Shopify-specific discovery format

## Authorization request

```ts
// First, discover the authentication endpoints
const discoveryResponse = await fetch(`https://${shopDomain}/.well-known/openid-configuration`);
const authConfig = await discoveryResponse.json();


// Now build the authorization request using the discovered endpoint
const clientId = process.env.CLIENT_ID;
const authorizationRequestUrl = new URL(authConfig.authorization_endpoint);


authorizationRequestUrl.searchParams.append(
  'scope',
  'openid email customer-account-api:full'
);
authorizationRequestUrl.searchParams.append(
  'client_id',
  clientId
);
authorizationRequestUrl.searchParams.append(
  'response_type',
  'code'
);
authorizationRequestUrl.searchParams.append(
  'redirect_uri',
  `<redirect_uri>`
);
authorizationRequestUrl.searchParams.append(
  'state',
  '<state>'
);
authorizationRequestUrl.searchParams.append(
  'nonce',
  '<nonce>'
);


// Public client
const verifier = await generateCodeVerifier();
const challenge = await generateCodeChallenge(verifier);
localStorage.setItem('code-verifier', verifier);


authorizationRequestUrl.searchParams.append(
  'code_challenge',
  challenge
);
authorizationRequestUrl.searchParams.append(
  'code_challenge_method',
  'S256'
);


window.location.href = authorizationRequestUrl.toString()
```

### Discover authentication endpoints

Before initiating the authorization flow, discover the authentication endpoints from the shop's storefront domain. The response contains `authorization_endpoint`, `token_endpoint`, `end_session_endpoint`, and `jwks_uri`.

The example code demonstrates how to:

1. Make a request to the discovery endpoint.
2. Parse the JSON response to access the authentication URLs.
3. Use these discovered endpoints in your OAuth flow.

You should include this discovery step once, at the beginning of your authentication flow. Then you can reuse the discovered endpoints throughout your application.

## Discover Authentication Endpoints

```ts
const discoveryUrl = `https://${shopDomain}/.well-known/openid-configuration`;


const response = await fetch(discoveryUrl);
const config = await response.json();


// config contains:
// {
//   "authorization_endpoint": "https://{shopDomain}/authentication/oauth/authorize",
//   "token_endpoint": "https://{shopDomain}/authentication/oauth/token",
//   "end_session_endpoint": "https://{shopDomain}/authentication/logout",
//   "jwks_uri": "https://{shopDomain}/authentication/.well-known/jwks.json",
//   "issuer": "https://shopify.com/authentication/{shopId}"
// }
```

### Authorization

To redirect a customer to the login page, use the `authorization_endpoint` from the discovery response with the following parameters:

***

scope•openid email customer-account-api:fullrequired

A list of scope names separated by space. Scopes are attached to all access tokens issued from this authorization request and determine what data these access token will be able to retrieve from API endpoints.

***

client\_id•\<client\_id>required

Unique UUID associated with the application. This should be visible in the Customer Account API settings of the given application / storefront.

***

response\_type•coderequired

Implies that authorization code flow will be used.

***

redirect\_uri•\<redirect\_uri>required

URL to redirect with `authorization code` after successful authentication. This has to be one of the redirect URIs defined in the customer account api settings of the given application/storefront. For public mobile applications, the scheme must be "shop.{shop\_id}.\*."

***

state•\<state>required

A string of characters which will be returned along with the `code` during callback/redirect. This is used to prevent CSRF/XSRF. See [Generating state](#generating-state) for more details on usage.

***

nonce•\<nonce>

This is used to mitigate replay attacks. The `nonce` will be returned in the `id_token` as part of the [Obtain access code](#obtain-access-token) step. See [Generating nonce](#generating-nonce) and [Retrieving Nonce](#retrieving-nonce) for more details on usage.

***

prompt•none

Specifies that no login screen should be shown to the user. If a session is present, a `code` is returned that can be used in the [Obtain access token](#obtain-access-token) step. If no session is present, a login\_required error is returned to your redirect\_uri endpoint.

***

locale•en

Specifies the the language for the login screen. Supported Locales: `en`, `fr`, `cs`, `da`, `de`, `el`, `es`, `fi`, `hi`, `hr`, `hu`, `id`, `it`, `ja`, `ko`, `lt`, `ms`, `nb`, `nl`, `pl`, `pt-BR`, `pt-PT`, `ro`, `ru`, `sk`, `sl`, `sv`, `th`, `tr`, `vi`, `zh-CN`, `zh-TW`

***

### Public client

In addition to the parameters above, public clients (web or mobile) need to provide the parameters outlined below.

Info

An example implementing a code challenge and verifier can be seen in the [Code challenge and verifier](#code-challenge-and-verifier-\(public-client-only\)) section

***

code\_challenge•\<code\_verifier>required

A string that is derived from the `code_verifier` using a hashing algorithm. The `code_verifier` is a string that is randomly generated by the client.

***

code\_challenge\_method•S256required

The code challenge method.

***

## Authorization Request

```ts
// First, discover the authentication endpoints
const discoveryResponse = await fetch(`https://${shopDomain}/.well-known/openid-configuration`);
const config = await discoveryResponse.json();


const clientId = process.env.CLIENT_ID;
const authorizationRequestUrl = new URL(config.authorization_endpoint);


authorizationRequestUrl.searchParams.append(
  'scope',
  'openid email customer-account-api:full'
);
authorizationRequestUrl.searchParams.append(
  'client_id',
  clientId
);
authorizationRequestUrl.searchParams.append(
  'response_type',
  'code'
);
authorizationRequestUrl.searchParams.append(
  'redirect_uri',
  `<redirect_uri>`
);
authorizationRequestUrl.searchParams.append(
  'state',
  '<state>'
);
authorizationRequestUrl.searchParams.append(
  'nonce',
  '<nonce>'
);


// Public client
const verifier = await generateCodeVerifier();
const challenge = await generateCodeChallenge(verifier);
localStorage.setItem('code-verifier', verifier);


authorizationRequestUrl.searchParams.append(
  'code_challenge',
  challenge
);
authorizationRequestUrl.searchParams.append(
  'code_challenge_method',
  'S256'
);


window.location.href = authorizationRequestUrl.toString()
```

### Retrieve code to get access token

When a customer successfully completes a login and is redirected to the uri specified in the parameters above, a `code` is received as a query parameter. The code will be utilized in the [Obtain access token](#obtain-access-token) step and enables you to make requests to the Customer Account API.

The optional `state` parameter will also be returned if it was part of the original [Authorization step](#authorization) above.

### Obtain access token

To authenticate with the Customer Account API, your application needs to obtain an access token. You can request an access token by sending a `POST` request to the `token_endpoint` discovered from the OpenID configuration:

If in the [Authorization step](#authorization) a `nonce` was passed, it can be validated using the [Retrieving nonce](#retrieving-nonce) step.

This will return a json result that contains the `access_token`, `refresh_token`, `id_token` and `expires_in` (in seconds) of the access token.

**Confidential client only**

Headers containing authorization credentials are required in order to get an access token. Check out the [Authorization header](#authorization) section for more details.

If a response code of `301` is returned, ensure the correct `shop_id` is specified in the `POST` request.

If a response code of `400` with a message of `invalid_grant` is returned, then ensure that padding is removed (for example, `=`) from your base64-encoded code challenge in the [Authorization step](#authorization). Additionally, make sure to replace “+” with “-” and “/” with “\_” to ensure compatibility with URL encoding.

If a response code of `401` with a message of `invalid_client` is returned, then verify that the `client_id` is correct.

If a response code of `401` with a message of `invalid_token` in the `www-authenticate` header is returned, then ensure that an `origin` header is specified in the request. Verify that the `origin` header specified is set in the list of Javascript Origin(s) in the Customer Account API settings page.

If a response code of `403` with a message of `You do not have permission to access this website` is returned, then ensure that a `user-agent` header is specified in the request.

With this access token, you can now make requests to the Customer Account API.

***

grant\_type•authorization\_coderequired

Must be set to `authorization_code`.

***

client\_id•\<client\_id>required

Same client\_id used in the `authorize` request.

***

redirect\_uri•\<redirect\_uri>required

Same redirect\_uri specified in the first `/authorize` request.

***

code•\<code>required

The `code` received as a parameter as part of the [Retrieve code](#retrieve-code-to-get-access-token) section.

***

### Public Client

In addition to the parameters above, public clients (web or mobile) need to provide the following parameters.

***

code\_verifier•\<code\_verifier>required

The `code_verifier` used to generate the `code_challenge` in the [Authorization](#authorization) section.

***

## Obtain Access Token

```ts
// First, discover the authentication endpoints
const discoveryResponse = await fetch(`https://${shopDomain}/.well-known/openid-configuration`);
const config = await discoveryResponse.json();


const clientId = process.env.CLIENT_ID;
const body = new URLSearchParams();


body.append('grant_type', 'authorization_code');
body.append('client_id', clientId);
body.append(
  'redirect_uri',
  `<redirect_uri>`,
);
body.append('code', code);


// Public Client
const codeVerifier = localStorage.getItem('code-verifier');
body.append('code_verifier', codeVerifier);


const headers = {
  'content-type': 'application/x-www-form-urlencoded',
  // Confidential Client
  'Authorization': 'Basic `<credentials>`'
}


// Use the discovered token_endpoint
const response = await fetch(config.token_endpoint, {
  method: 'POST',
  headers: headers,
  body,
});


interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
}


const {access_token, expires_in, id_token, refresh_token} =
  await response.json<AccessTokenResponse>();
```

### Use refresh token

The access token retrieved in the previous step has an associated `expires_in` property (in seconds). Once that has passed, the access token is invalid and needs to be refreshed.

The procedure to refresh the token is very similar to the [Obtain access token step](#obtain-access-token) except different parameters are passed.

To refresh your token, make a `POST` request to the `token_endpoint` from the discovery response:

***

grant\_type•refresh\_tokenrequired

Must be set to `refresh_token`.

***

client\_id•\<client\_id>required

Same client\_id used in the `authorize` request.

***

refresh\_token•\<refresh\_token>required

The `refresh_token` received as part of the [Obtain access token step](#obtain-access-token).

***

## Refresh Token

```ts
// First, discover the authentication endpoints
const discoveryResponse = await fetch(`https://${shopDomain}/.well-known/openid-configuration`);
const config = await discoveryResponse.json();


const clientId = process.env.CLIENT_ID;
const body = new URLSearchParams();


body.append('grant_type', 'refresh_token');
body.append('client_id', clientId);
body.append('refresh_token', refresh_token);


const headers = {
  'content-type': 'application/x-www-form-urlencoded',
  // Confidential Client
  'Authorization': 'Basic `<credentials>`'
}


// Use the discovered token_endpoint
const response = await fetch(config.token_endpoint, {
  method: 'POST',
  headers: headers,
  body,
});


interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
}


const {access_token, expires_in, refresh_token} =
  await response.json<Omit<AccessTokenResponse, 'id_token'>>();
```

### Authorization header (confidential client only)

An Authorization Header is a Base64 encode of the `client_id` and `client_secret` and is required for certain requests.

## Authorization Header

```js
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;


const credentials = btoa(`${clientId}:${clientSecret}`);
```

### Code challenge and verifier (public client only)

A code challenge and verifier are needed when doing requests from a public client in order to verify that the client is the same client that initiated the authorization request.

## Code Challenge and Verifier

```ts
export async function generateCodeVerifier() {
  const rando = generateRandomCode();
  return base64UrlEncode(rando);
}


export async function generateCodeChallenge(codeVerifier: string) {
  const digestOp = await crypto.subtle.digest(
    { name: "SHA-256" },
    new TextEncoder().encode(codeVerifier)
  );
  const hash = convertBufferToString(digestOp);
  return base64UrlEncode(hash);
}


function generateRandomCode() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return String.fromCharCode.apply(null, Array.from(array));
}


function base64UrlEncode(str: string) {
  const base64 = btoa(str);
  // This is to ensure that the encoding does not have +, /, or = characters in it.
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}


function convertBufferToString(hash: ArrayBuffer) {
  const uintArray = new Uint8Array(hash);
  const numberArray = Array.from(uintArray);
  return String.fromCharCode(...numberArray);
}
```

### Generating state

The state parameter is used to maintain the state of the client application during the [Authorization step](#authorization). It acts as a security measure to prevent cross-site request forgery (CSRF) attacks.

This `state` is then returned as a parameter in addition to the `code` in the [Retrieve code to get access token](#retrieve-code-to-get-access-token) and can be used to verify that the response matches the request.

## Generating State

```ts
export async function generateState(): Promise<string> {
  const timestamp = Date.now().toString();
  const randomString = Math.random().toString(36).substring(2);
  return timestamp + randomString;
}
```

### Generating nonce

A nonce (number used once) is a random or unique value used to prevent replay attacks. It can be provided in the [Authorization step](#authorization) to ensure the freshness and integrity of the communication.

Nonces help protect against unauthorized reuse of captured messages by verifying that they are recent and have not been tampered with.

Once passed as part of the [Authorization step](#authorization), it can be verified in the [Obtain access token step](#obtain-access-token). See [Retrieving nonce](#retrieving-nonce) for more information.

## Generating Nonce

```ts
export async function generateNonce(length: number) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';


  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    nonce += characters.charAt(randomIndex);
  }


  return nonce;
}
```

### Retrieving nonce

In the [Obtain access token step](#obtain-access-token) an `id_token` is returned, this is an encoded JWT token that once decoded contains the nonce that was passed in the [Authorization step](#authorization).

## Retrieving Nonce

```ts
export async function getNonce(token: string) {
  return decodeJwt(token).payload.nonce;
}


export function decodeJwt(token: string) {
  const [header, payload, signature] = token.split('.');


  const decodedHeader = JSON.parse(atob(header));
  const decodedPayload = JSON.parse(atob(payload));


  return {
    header: decodedHeader,
    payload: decodedPayload,
    signature,
  };
}
```

### Logging out

To log out a customer, redirect them to the `end_session_endpoint` discovered from the OpenID configuration:

***

id\_token\_hint•\<id\_token>required

The `id_token` received as part of the [Obtain access code](#obtain-access-token) step

***

post\_logout\_redirect\_uri•\<post\_logout\_redirect\_uri>required

The URI to redirect to after logging out. If this isn't specified, then the uri to redirect to will to one of the URIs in the Logout URI setting.

***

#### Mobile client

For mobile clients, the logout uri can be called as an API endpoint that returns a `200 OK` status code on successful logout, rather than performing a redirect. `id_token_hint` is still required.

### Stay authenticated from Headless storefront to Checkout

In order to stay authenticated from the headless storefront to checkout, you need to add a query parameter `logged_in=true` to the end of the checkout url.

For example, if the checkout url is `https://<shop-domain>/checkouts/<checkout_id>`, then the URL should look like this:

`https://<shop-domain>/checkouts/<checkout_id>?logged_in=true`

### Stay authenticated from Checkout to Headless storefront via Cart

Info

Customer Accounts must be enabled.

There are situations where a customer can be authenticated in checkout but not in the headless storefront. This can be addressed with the following steps.

During the [Authorization step](#authorization) detailed above, include the optional `prompt` parameter with a value of `none`. This performs a silent check with the authorization server and will not prompt the customer to log in again. If the customer's session has expired, the `redirect_uri` will receive code parameter set to `login_required`.

***

## Endpoints and queries

The Customer Account API is available only in GraphQL.

### Discover API endpoints

Before making API requests, discover the GraphQL endpoint dynamically from the shop's storefront domain. The response contains `graphql_api` and `mcp_api` endpoints with the current API version already included.

The example code demonstrates how to:

1. Make a request to the Customer Account API discovery endpoint.
2. Parse the JSON response to get the GraphQL and MCP API URLs.
3. Use the discovered `graphql_api` endpoint for your API requests.

The discovered endpoint already includes the latest stable API version, so you can use it directly without appending version numbers.

## Discover API Endpoints

```ts
const apiDiscoveryUrl = `https://${shopDomain}/.well-known/customer-account-api`;


const response = await fetch(apiDiscoveryUrl);
const apiConfig = await response.json();


// apiConfig contains:
// {
//   "graphql_api": "https://{shopDomain}/customer/api/{LATEST_API_VERSION}/graphql",
//   "mcp_api": "https://{shopDomain}/customer/api/mcp"
// }
// Note: URLs will use the shop's configured customer accounts domain,
// which may be a custom vanity domain instead of myshopify.com


// Use the discovered GraphQL endpoint directly (already includes version)
const graphqlEndpoint = apiConfig.graphql_api;
```

Like other Shopify APIs, the Customer Account API releases once a quarter. If you need a specific API version, then construct the [versioned URL](https://shopify.dev/docs/api/usage/versioning) from the discovered URL.

`https://{shop-domain}/customer/api/2025-04/graphql`

If this request responds with a `500`, then verify you don't have any misspelled parameters when obtaining the [access token](#obtain-access-token).

POST

## Dynamic GraphQL Endpoint

```js
// First discover the API endpoints
const apiDiscoveryResponse = await fetch(`https://${shopDomain}/.well-known/customer-account-api`);
const apiConfig = await apiDiscoveryResponse.json();


// Use the discovered endpoint directly
const graphqlEndpoint = apiConfig.graphql_api;


const response = await fetch(graphqlEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: {access_token},
  },
  body: JSON.stringify({
    operationName: 'SomeQuery',
    query: 'query { customer { emailAddress { emailAddress }}}',
    variables: {},
  }),
});
```

```bash
# First discover the API endpoint
API_CONFIG=$(curl -s https://{shopDomain}/.well-known/customer-account-api)
GRAPHQL_ENDPOINT=$(echo $API_CONFIG | jq -r '.graphql_api')


# Use the discovered endpoint to make API calls (version already included)
curl -X POST \
  "${GRAPHQL_ENDPOINT}" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: {access_token}' \
  -d '
  query {
    customer {
      emailAddress {
        emailAddress
      }
    }
  }
  '
```

##### Node.js

```
// First discover the API endpoints
const apiDiscoveryResponse = await fetch(`https://${shopDomain}/.well-known/customer-account-api`);
const apiConfig = await apiDiscoveryResponse.json();

// Use the discovered endpoint directly
const graphqlEndpoint = apiConfig.graphql_api;

const response = await fetch(graphqlEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: {access_token},
  },
  body: JSON.stringify({
    operationName: 'SomeQuery',
    query: 'query { customer { emailAddress { emailAddress }}}',
    variables: {},
  }),
});
```

##### cURL

```
# First discover the API endpoint
API_CONFIG=$(curl -s https://{shopDomain}/.well-known/customer-account-api)
GRAPHQL_ENDPOINT=$(echo $API_CONFIG | jq -r '.graphql_api')

# Use the discovered endpoint to make API calls (version already included)
curl -X POST \
  "${GRAPHQL_ENDPOINT}" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: {access_token}' \
  -d '
  query {
    customer {
      emailAddress {
        emailAddress
      }
    }
  }
  '
```

***

## Directives

A directive provides a way for apps to describe additional options to the GraphQL executor. It lets GraphQL change the result of the query or mutation based on the additional information provided by the directive.

### Customer Account API Directives

***

#### @in​Context (Language)

In Customer Account API versions higher than 2025-04, the `@incontext` directive takes an optional [language code argument](https://shopify.dev/api/customer/2025-04/enums/LanguageCode) and applies this to the query or mutation.

This example shows how to return user errors that are translated into French `@incontext(language: FR)`.

***

## @inContext (Country Code)

```graphql
mutation customerAddressUpdate @inContext(language: FR){
  customerAddressUpdate(address: {phoneNumber: "invalid123"}, addressId: "gid://shopify/CustomerAddress/123456" ) {
    userErrors {
      code
      field
      message
    }
  }
}
```

## Response

JSON

```json
{
  "data": {
    "customerAddressUpdate": {
      "userErrors": [
        {
          "code": "PHONE_NUMBER_NOT_VALID",
          "field": null,
          "message": "Le numéro de téléphone n'est pas valide."
        }
      ]
    }
  },
  "extensions": {
    "context": {
      "country": "CA",
      "language": "FR"
    },
    "cost": {
      "requestedQueryCost": 10,
      "actualQueryCost": 10
    }
  }
}
```

***

## Rate limits

The Customer Account API is rate-limited using calculated query costs, measured in cost points. Each field returned by a query costs a set number of points. The total cost of a query is the sum of all the fields it returns, so more complex queries cost more to run.

This API limits each app to 7500 cost points per store and customer. This quota replenishes at a rate of either 100.0 or 200.0 cost points per second, depending on your plan.

Most fields cost 1 point. Most mutations cost 10 points. The best way to determine the true cost of a query is to run it. The API response includes information about the total query cost and the client's current quota under the extensions key. Include a `Shopify-GraphQL-Cost-Debug=1` header to receive a more detailed breakdown of the query cost.

Learn more about [rate limits](https://shopify.dev/api/usage/limits#rate-limits).

{}

## Request

```graphql
{
  customer {
    firstName
    lastName
  }
}
```

{}

## Response

```json
{
    "errors": [{
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED",
        "documentation": "https://shopify.dev/api/usage/limits#rate-limits"
      }
    }]
  }
```

***

## Status and error codes

All API queries return HTTP status codes that contain more information about the response.

### 200 OK

GraphQL HTTP status codes are different from REST API status codes. Most importantly, the GraphQL API can return a `200 OK` response code in cases that would typically produce 4xx or 5xx errors in REST.

### Error handling

The response for the errors object contains additional detail to help you debug your operation.

The response for mutations contains additional detail to help debug your query. To access this, you must request `userErrors`.

#### Properties

* errorsarray

A list of all errors returned

* errors\[n].​messagestring

Contains details about the error(s).

* errors\[n].​extensionsobject

Provides more information about the error(s) including properties and metadata.

* extensions.​codestring

Shows error codes common to Shopify. Additional error codes may also be shown.

* THROTTLED

The client has exceeded the [rate limit](#rate-limits). Similar to 429 Too Many Requests.

* SHOP\_​INACTIVE

The shop is not active. This can happen when stores repeatedly exceed API rate limits or due to fraud risk.

* INTERNAL\_​SERVER\_​ERROR

Shopify experienced an internal error while processing the request. This error is returned instead of 500 Internal Server Error in most circumstances.

***

{}

## Sample 200 error responses

```json
{
  "errors": [
    {
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED",
        "documentation": "https://shopify.dev/api/usage/limits#rate-limits"
      }
    }
  ]
}
```

{

"errors": \[

{

"message": "Internal error. Looks like something went wrong on our end.

Request ID: 1b355a21-7117-44c5-8d8b-8948082f40a8 (include this in support requests).",

"extensions": {

"code": "INTERNAL\_SERVER\_ERROR",

}

}

]

}

##### Throttled

```
{
  "errors": [
    {
      "message": "Throttled",
      "extensions": {
        "code": "THROTTLED",
        "documentation": "https://shopify.dev/api/usage/limits#rate-limits"
      }
    }
  ]
}
```

##### Internal

```
{
  "errors": [
    {
      "message": "Internal error. Looks like something went wrong on our end.
Request ID: 1b355a21-7117-44c5-8d8b-8948082f40a8 (include this in support requests).",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
      }
    }
  ]
}
```

### 4xx and 5xx status codes

The 4xx and 5xx errors occur infrequently. They are often related to network communications, your account, or an issue with Shopify’s services.

Many errors that would typically return a 4xx or 5xx status code, return an HTTP 200 errors response instead. Refer to the [200 OK section](#200-ok) above for details.

***

#### 400 Bad Request

The server will not process the request.

***

#### 401 Bad Request

The client does not have correct [authentication](#authentication) credentials.

***

#### 402 Payment Required

The shop is frozen. The shop owner will need to pay the outstanding balance to [unfreeze](https://help.shopify.com/en/manual/your-account/pause-close-store#unfreeze-your-shopify-store) the shop.

***

#### 403 Forbidden

The shop is forbidden. Returned if the store has been marked as fraudulent.

***

#### 404 Not Found

The resource isn’t available. This is often caused by querying for something that’s been deleted.

***

#### 423 Locked

The shop isn’t available. This can happen when stores repeatedly exceed API rate limits or due to fraud risk.

***

#### 5xx Errors

An internal error occurred in Shopify. Check out the [Shopify status page](https://www.shopifystatus.com) for more information.

***

Info

Didn’t find the status code you’re looking for? View the complete list of [API status response and error codes](https://shopify.dev/api/usage/response-codes).

{}

## Sample error codes

HTTP/1.1 400 Bad Request

{

"errors": {

"query": "Required parameter missing or invalid"

}

}

HTTP/1.1 401 Unauthorized

{

"errors": "User does not have access"

}

HTTP/1.1 402 Payment Required

{

"errors": "This shop's plan does not have access to this feature"

}

HTTP/1.1 403 Access Denied

{

"errors": "User does not have access"

}

HTTP/1.1 404 Not Found

{

"errors": "Not Found"

}

HTTP/1.1 423 Locked

{

"errors": "This shop is unavailable"

}

HTTP/1.1 500 Internal Server Error

{

"errors": "An unexpected error occurred"

}

##### 400

```
HTTP/1.1 400 Bad Request
{
  "errors": {
    "query": "Required parameter missing or invalid"
  }
}
```

##### 401

```
HTTP/1.1 401 Unauthorized
{
  "errors": "User does not have access"
}
```

##### 402

```
HTTP/1.1 402 Payment Required
{
  "errors": "This shop's plan does not have access to this feature"
}
```

##### 403

```
HTTP/1.1 403 Access Denied
{
  "errors": "User does not have access"
}
```

##### 404

```
HTTP/1.1 404 Not Found
{
  "errors": "Not Found"
}
```

##### 423

```
HTTP/1.1 423 Locked
{
  "errors": "This shop is unavailable"
}
```

##### 500

```
HTTP/1.1 500 Internal Server Error
{
  "errors": "An unexpected error occurred"
}
```

***