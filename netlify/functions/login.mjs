import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const ALLOWED_ORIGIN = 'https://netlifyabc.github.io';
const JWT_SECRET = process.env.JWT_SECRET;

export async function handler(event) {
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

    const loginQuery = `
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

    const loginResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({
        query: loginQuery,
        variables: {
          input: { email, password },
        },
      }),
    });

    const loginResult = await loginResponse.json();

    const errors = loginResult.data.customerAccessTokenCreate.customerUserErrors;
    const tokenInfo = loginResult.data.customerAccessTokenCreate.customerAccessToken;

    if (errors.length > 0 || !tokenInfo) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: errors[0]?.message || 'Authentication failed' }),
      };
    }

    // 获取用户信息
    const customerQuery = `
      {
        customer(customerAccessToken: "${tokenInfo.accessToken}") {
          id
          firstName
          lastName
          email
        }
      }
    `;

    const customerRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify({ query: customerQuery }),
    });

    const customerData = await customerRes.json();
    const customer = customerData.data?.customer;

    if (!customer) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch customer data' }),
      };
    }

    // ✅ 添加 customerAccessToken 到 JWT payload
    const payload = {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      customerAccessToken: tokenInfo.accessToken,  // 必须有
    };

    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Login successful',
        token: jwtToken,
        expiresIn: 7 * 24 * 3600,
        customer,
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
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
} 