import fetch from 'node-fetch';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

// 允许的前端域名，写你实际前端地址
const ALLOWED_ORIGINS = [
  'https://netlifyabc.github.io',
  'https://my-netlify-pro.netlify.app',
];

// GraphQL 查询客户订单
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
  try {
    const origin = event.headers.origin;
    // 判断请求的 Origin 是否在允许列表中，未命中则不允许跨域
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

    const headers = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
      // CORS 预检请求响应
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

    const body = JSON.parse(event.body || '{}');
    const { customerAccessToken } = body;

    if (!customerAccessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing customerAccessToken' }),
      };
    }

    // 调用 Shopify Storefront API
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`, {
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

    if (!response.ok) {
      const text = await response.text();
      console.error('Shopify API HTTP error:', response.status, text);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Shopify API request failed' }),
      };
    }

    const result = await response.json();

    if (result.errors) {
      console.error('Shopify GraphQL errors:', result.errors);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Shopify GraphQL errors', details: result.errors }),
      };
    }

    if (!result.data.customer) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Customer not found or invalid token' }),
      };
    }

    const orders = result.data.customer.orders.edges.map(edge => edge.node);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orders }),
    };
  } catch (error) {
    console.error('get-orders handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*', // 服务器错误时允许跨域
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }



} 