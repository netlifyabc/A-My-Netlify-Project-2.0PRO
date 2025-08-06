// ✅ Node.js 18+ 原生支持 fetch，无需 node-fetch

// 🛠️ 环境变量检查
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

if (!SHOPIFY_DOMAIN || !API_VERSION || !TOKEN) {
  throw new Error('❌ Missing one or more required Shopify environment variables');
}

const endpoint = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

// CORS 允许的响应头
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 生产环境建议改成你前端域名
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Shopify GraphQL 请求包装
async function shopifyFetch(query, variables = {}) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN,
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
  } catch (err) {
    console.error('❌ Fetch Exception:', err);
    throw err;
  }
}

// GraphQL 查询模板
const CART_CREATE_QUERY = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 5) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_ADD_QUERY = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        lines(first: 5) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// 主函数（包含 CORS 处理）
exports.handler = async (event) => {
  // 处理预检请求（OPTIONS）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: 'OK',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { merchandiseId, quantity = 1, cartId } = body;

    if (!merchandiseId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing merchandiseId in request body' }),
      };
    }

    let responseData;

    if (cartId) {
      responseData = await shopifyFetch(CART_LINES_ADD_QUERY, {
        cartId,
        lines: [{ merchandiseId, quantity }],
      });
    } else {
      responseData = await shopifyFetch(CART_CREATE_QUERY, {
        input: {
          lines: [{ merchandiseId, quantity }],
        },
      });
    }

    const cart = responseData?.cartCreate?.cart || responseData?.cartLinesAdd?.cart;
    const userErrors =
      responseData?.cartCreate?.userErrors || responseData?.cartLinesAdd?.userErrors;

    if (userErrors?.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'User input error', details: userErrors }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ cart }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};


