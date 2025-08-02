// netlify/functions/seed-reviews.mjs

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

if (!SHOPIFY_DOMAIN || !API_VERSION || !ADMIN_TOKEN) {
  throw new Error('❌ 缺少环境变量（SHOPIFY_STORE_DOMAIN、SHOPIFY_API_VERSION、SHOPIFY_ADMIN_API_TOKEN）');
}

const endpoint = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// 示例启动期评论数据
const seedReviews = [
  {
    name: 'Alice L.',
    rating: 5,
    content: 'Absolutely love the design and comfort. Highly recommended!',
    date: '2025-07-22',
    avatar: 'https://i.pravatar.cc/48?u=10',
    variant: 'Pearl White',
  },
  {
    name: 'Ben W.',
    rating: 4,
    content: 'Good value for money. A bit firm but great support.',
    date: '2025-07-16',
    avatar: 'https://i.pravatar.cc/48?u=11',
    variant: 'Shadow Gray',
  },
  {
    name: 'Clara G.',
    rating: 5,
    content: 'Bought it for my studio – it looks amazing!',
    date: '2025-06-30',
    avatar: 'https://i.pravatar.cc/48?u=12',
    variant: 'Emerald Green',
  },
];

async function shopifyAdminFetch(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    const message = json.errors?.map(err => err.message).join('; ') || res.statusText;
    console.error('❌ Shopify API Error:', message);
    throw new Error(message);
  }

  return json.data;
}

// 👇 替换为你的产品 GID
const PRODUCT_ID = 'gid://shopify/Product/15059429687620';

const REVIEW_METAFIELD_NAMESPACE = 'custom';
const REVIEW_METAFIELD_KEY = 'reviews';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: 'OK',
    };
  }

  try {
    // 查询现有 metafield
    const existing = await shopifyAdminFetch(
      `
      query getProductMetafields($id: ID!) {
        product(id: $id) {
          metafield(namespace: "${REVIEW_METAFIELD_NAMESPACE}", key: "${REVIEW_METAFIELD_KEY}") {
            id
            value
          }
        }
      }
      `,
      { id: PRODUCT_ID }
    );

    let existingReviews = [];
    if (existing?.product?.metafield?.value) {
      try {
        existingReviews = JSON.parse(existing.product.metafield.value);
      } catch (e) {
        console.warn('⚠️ Failed to parse existing reviews:', e.message);
      }
    }

    // 合并已有评论和启动示例评论
    const newReviews = [...existingReviews, ...seedReviews];

    // 更新 metafield
    const mutation = `
      mutation UpdateProductMetafields($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            metafields(first: 5) {
              edges {
                node {
                  id
                  key
                  value
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

    const mutationInput = {
      input: {
        id: PRODUCT_ID,
        metafields: [
          {
            namespace: REVIEW_METAFIELD_NAMESPACE,
            key: REVIEW_METAFIELD_KEY,
            type: 'json',
            value: JSON.stringify(newReviews),
          },
        ],
      },
    };

    const result = await shopifyAdminFetch(mutation, mutationInput);

    const errors = result?.productUpdate?.userErrors;
    if (errors?.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'User error', details: errors }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, added: seedReviews.length }),
    };
  } catch (err) {
    console.error('❌ Function Error:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }

}; 