// netlify/functions/login.js

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

    // Shopify 登录认证请求
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

    // 查询客户信息，方便放进 JWT 载荷
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

    if (!customer) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch customer data' }),
      };
    }

    // 生成自己的 JWT，载荷可以根据需要调整
    const payload = {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    };

    const jwtToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Login successful',
        token: jwtToken,          // 返回自己的 JWT
        expiresIn: 7 * 24 * 3600, // 7天秒数
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