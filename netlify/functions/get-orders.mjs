import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '';
const JWT_SECRET = process.env.JWT_SECRET;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

function getCorsHeaders(origin) {
  const allowedOrigins = ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  if (allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  return {};
}

const CUSTOMER_ORDERS_QUERY = `
  query customerOrders($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      orders(first: 10) {
        edges {
          node {
            id
            orderNumber
            processedAt
            totalPriceV2 {
              amount
              currencyCode
            }
            fulfillmentStatus
            financialStatus
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

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

  if (!JWT_SECRET || !SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
    console.error('Missing required environment variables');
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return {
      statusCode: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Missing or invalid Authorization header' }),
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const customerAccessToken = decoded.customerAccessToken;

    if (!customerAccessToken) {
      return {
        statusCode: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid token payload' }),
      };
    }

    // 请求 Shopify 获取订单数据
    const shopifyRes = await fetch(`https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: CUSTOMER_ORDERS_QUERY,
        variables: { customerAccessToken },
      }),
    });

    if (!shopifyRes.ok) {
      const text = await shopifyRes.text();
      console.error('Shopify error response:', text);
      return {
        statusCode: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Failed to fetch orders from Shopify' }),
      };
    }

    const result = await shopifyRes.json();

    if (result.errors || !result.data?.customer) {
      return {
        statusCode: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Customer not found or token invalid', details: result.errors }),
      };
    }

    const orders = result.data.customer.orders.edges.map(edge => edge.node);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orders }),
    };
  } catch (err) {
    console.error('Error in get-orders:', err);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal Server Error', message: err.message }),
    };
  }

} 