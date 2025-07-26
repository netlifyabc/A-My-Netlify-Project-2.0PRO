// netlify/functions/register.js

exports.handler = async function (event) {
  const ALLOWED_ORIGIN = 'https://netlifyabc.github.io';

  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // 预检请求直接返回
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // 动态导入 node-fetch
    const fetch = (await import('node-fetch')).default;

    const { firstName, lastName, email, password } = JSON.parse(event.body);

    if (!email || !password || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    const endpoint = `https://${shopifyDomain}/api/${apiVersion}/graphql.json`;

    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: { firstName, lastName, email, password },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const result = await response.json();

    if (result.errors) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Shopify error', details: result.errors }),
      };
    }

    const { customer, customerUserErrors } = result.data.customerCreate;

    if (customerUserErrors && customerUserErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Shopify validation failed', details: customerUserErrors }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Customer created successfully',
        customer,
      }),
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: error.stack,
      }),
    };
  }

};




