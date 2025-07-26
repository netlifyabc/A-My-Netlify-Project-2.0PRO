// netlify/functions/login.js

// 动态导入 node-fetch
let fetch;
const fetchPromise = import('node-fetch').then(mod => {
  fetch = mod.default;
});

exports.handler = async function (event) {
  await fetchPromise; // 确保 fetch 可用

  const ALLOWED_ORIGIN = 'https://netlifyabc.github.io';

  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

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
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-04';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    const endpoint = `https://${shopifyDomain}/api/${apiVersion}/graphql.json`;

    const query = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            email,
            password,
          },
        },
      }),
    });

    const result = await response.json();
    const errors = result.data.customerAccessTokenCreate.customerUserErrors;
    const tokenInfo = result.data.customerAccessTokenCreate.customerAccessToken;

    if (errors.length > 0 || !tokenInfo) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: errors[0]?.message || 'Authentication failed' }),
      };
    }

    // 可选：查询客户信息
    const customerQuery = `
      {
        customer(customerAccessToken: "${tokenInfo.accessToken}") {
          firstName
          lastName
          email
        }
      }
    `;

    const customerResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query: customerQuery }),
    });

    const customerResult = await customerResponse.json();
    const customer = customerResult.data?.customer;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Login successful',
        token: tokenInfo.accessToken,
        expiresAt: tokenInfo.expiresAt,
        customer,
      }),
    };
  } catch (error) {
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




