// ✅ Node.js 18+ 原生 fetch get-orders.js 

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

if (!SHOPIFY_DOMAIN || !API_VERSION || !STOREFRONT_TOKEN) {
  throw new Error('❌ Missing Shopify environment variables');
}

const endpoint = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

// 注意这里的 origin 是调用页面的 origin，不是函数的 URL
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://my-netlify-pro.netlify.app',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Shopify Storefront API GraphQL 请求封装
async function shopifyFetch(query, variables = {}, token = STOREFRONT_TOKEN) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('❌ HTTP Error:', res.status, text);
    throw new Error(`Shopify API HTTP error ${res.status}`);
  }

  const json = JSON.parse(text);
  if (json.errors) {
    console.error('❌ GraphQL Error:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL errors from Shopify');
  }
  return json.data;
}

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

exports.handler = async (event) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: 'OK',
    };
  }

  // 只允许 POST 方法
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { customerAccessToken } = body;

    if (!customerAccessToken) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing customerAccessToken' }),
      };
    }

    // 使用客户 access token 查询订单
    const data = await shopifyFetch(CUSTOMER_ORDERS_QUERY, { customerAccessToken });

    if (!data.customer) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Customer not found or invalid token' }),
      };
    }

    const orders = data.customer.orders.edges.map(edge => edge.node);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ orders }),
    };
  } catch (err) {
    console.error('❌ get-orders error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }



  

  
}; 