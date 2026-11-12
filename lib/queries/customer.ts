import "server-only";

import {
  createCustomerAccountClient,
  gql,
} from "@shopify/hydrogen/customer-account";

/**
 * Customer Account API documents use `gql` from
 * `@shopify/hydrogen/customer-account`, kept separate from the Storefront API's
 * `gql` so the two cannot be mixed. The same ts-plugin and `hydrogen gql check`
 * validate both.
 */
export const CUSTOMER_QUERY = gql(`
  query CurrentCustomer {
    customer {
      firstName
      lastName
      emailAddress { emailAddress }
    }
  }
`);

export { createCustomerAccountClient };
