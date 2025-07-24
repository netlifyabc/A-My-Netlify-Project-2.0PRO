exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { firstName, lastName, email, password } = JSON.parse(event.body);

    if (!firstName || !lastName || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!SHOP_DOMAIN || !STOREFRONT_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Shopify Storefront API credentials' }),
      };
    }

    const query = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        firstName,
        lastName,
        email,
        password,
        acceptsMarketing: false
      }
    };

    const response = await fetch(`https://${SHOP_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Shopify API request failed', details: text }),
      };
    }

    const result = await response.json();

    if (result.errors) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Shopify API returned errors', details: result.errors }),
      };
    }

    const userErrors = result.data.customerCreate.customerUserErrors;
    if (userErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User input error', details: userErrors }),
      };
    }

    const customer = result.data.customerCreate.customer;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Customer created successfully',
        customer,
      }),
    };

  } catch (error) {
    console.error('Register error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

console.log('SHOPIFY_STORE_DOMAIN:', process.env.SHOPIFY_STORE_DOMAIN);
console.log('SHOPIFY_STOREFRONT_TOKEN:', process.env.SHOPIFY_STOREFRONT_TOKEN ? '****' : 'NOT SET');




