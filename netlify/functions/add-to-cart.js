const fetch = require('node-fetch');

// 🛠️ 环境变量检查
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

if (!SHOPIFY_DOMAIN || !API_VERSION || !TOKEN) {
  throw new Error('❌ Missing one or more required Shopify environment variables');
}

const endpoint = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

// 🧠 通用 Shopify fetch 包装器
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

// 🧩 GraphQL 模板
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

// ✅ 主函数
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    const { merchandiseId, quantity = 1, cartId } = body;

    if (!merchandiseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing merchandiseId in request body' }),
      };
    }

    let responseData;

    if (cartId) {
      // ➕ 添加到已有购物车
      responseData = await shopifyFetch(CART_LINES_ADD_QUERY, {
        cartId,
        lines: [{ merchandiseId, quantity }],
      });
    } else {
      // 🛒 创建新购物车
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
        body: JSON.stringify({ error: 'User input error', details: userErrors }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ cart }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};



