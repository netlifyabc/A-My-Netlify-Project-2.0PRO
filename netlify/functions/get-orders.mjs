import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// 允许跨域的域名，逗号分隔（例如：'https://netlifyabc.github.io,https://yourdomain.com'）
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '';
const JWT_SECRET = process.env.JWT_SECRET;

function getCorsHeaders(origin) {
  const allowedOrigins = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  // 如果请求的 Origin 不在白名单中，则不返回跨域头，浏览器会拒绝
  return {};
}

export async function handler(event) {
  const origin = event.headers.origin || '';
  const corsHeaders = getCorsHeaders(origin);

  // 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  // 只允许 POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  // 验证环境变量是否配置
  if (!JWT_SECRET) {
    console.error('Missing JWT_SECRET environment variable');
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    const { firstName, lastName, email, password } = JSON.parse(event.body || '{}');

    if (!email || !password || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Missing required fields: firstName, lastName, email, password' }),
      };
    }

    const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!shopifyDomain || !storefrontToken) {
      console.error('Missing Shopify environment variables');
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

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

    const variables = { input: { firstName, lastName, email, password } };

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
      console.error('Shopify API errors:', result.errors);
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Shopify API error', details: result.errors }),
      };
    }

    const { customer, customerUserErrors } = result.data.customerCreate;

    if (customerUserErrors && customerUserErrors.length > 0) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Shopify validation failed', details: customerUserErrors }),
      };
    }

    const payload = {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Customer created successfully',
        customer,
        token,
      }),
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
    };
  }


}  