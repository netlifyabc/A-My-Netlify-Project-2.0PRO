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
    console.error('❌ Shopify Error:', json.errors || res.statusText);
    throw new Error('Shopify API error');
  }

  return json.data;
}

const seedReviews = [
  {
    name: 'Alice L.',
    rating: 5,
    content: 'Absolutely love the design and comfort. Highly recommended!',
  },
  {
    name: 'Ben W.',
    rating: 4,
    content: 'Good value for money. A bit firm but great support.',
  },
  {
    name: 'Clara G.',
    rating: 5,
    content: 'Bought it for my studio – it looks amazing!',
  },
];

const PRODUCT_ID = 'gid://shopify/Product/8765432109876'; // 👈 替换为你的产品 ID

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
    const existing = await shopifyAdminFetch(`
      query getProductMetafields($id: ID!) {
        product(id: $id) {
          metafield(namespace: "${REVIEW_METAFIELD_NAMESPACE}", key: "${REVIEW_METAFIELD_KEY}") {
            id
            value
          }
        }
      }
    `, { id: PRODUCT_ID });

    let existingReviews = [];
    let metafieldId = null;

    if (existing?.product?.metafield) {
      metafieldId = existing.product.metafield.id;
      existingReviews = JSON.parse(existing.product.metafield.value || '[]');
    }

    const newReviews = [...existingReviews, ...seedReviews];

    const mutation = metafieldId
      ? `
        mutation UpdateMetafield($metafield: MetafieldInput!) {
          metafieldUpdate(input: $metafield) {
            metafield {
              id
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `
      : `
        mutation CreateMetafield($metafield: MetafieldInput!) {
          metafieldCreate(input: $metafield) {
            metafield {
              id
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

    const mutationInput = {
      metafield: {
        ...(metafieldId ? { id: metafieldId } : {
          ownerId: PRODUCT_ID,
          namespace: REVIEW_METAFIELD_NAMESPACE,
          key: REVIEW_METAFIELD_KEY,
          type: 'json',
        }),
        value: JSON.stringify(newReviews),
      },
    };

    const result = await shopifyAdminFetch(mutation, mutationInput);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, added: seedReviews.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
}; 