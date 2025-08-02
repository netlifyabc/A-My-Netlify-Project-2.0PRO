// netlify/functions/get-reviews.mjs

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const PRODUCT_ID = 'gid://shopify/Product/15059429687620'; // ✅ 替换为你的产品 GID
const REVIEW_METAFIELD_NAMESPACE = 'custom';
const REVIEW_METAFIELD_KEY = 'reviews';

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
    const message = json.errors?.map(err => err.message).join('; ') || res.statusText;
    console.error('❌ Shopify API Error:', message);
    throw new Error(message);
  }

  return json.data;
}

function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleDateString('en-US', options); // e.g. August 2, 2025
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: 'OK',
    };
  }

  try {
    const data = await shopifyAdminFetch(`
      query GetProductReviews($id: ID!) {
        product(id: $id) {
          metafield(namespace: "${REVIEW_METAFIELD_NAMESPACE}", key: "${REVIEW_METAFIELD_KEY}") {
            id
            value
          }
        }
      }
    `, { id: PRODUCT_ID });

    let reviews = [];

    if (data?.product?.metafield?.value) {
      try {
        const parsed = JSON.parse(data.product.metafield.value);
        if (Array.isArray(parsed)) {
          reviews = parsed.map(r => ({
            name: r.name || 'Anonymous',
            rating: r.rating || 0,
            content: r.content || '',
            date: formatDate(r.date), // ✅ 格式化显示
          }));
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse metafield JSON:', e.message);
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reviews }),
    };
  } catch (err) {
    console.error('❌ get-reviews Error:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};  