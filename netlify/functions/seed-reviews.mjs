// netlify/functions/seed-reviews.mjs

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

if (!SHOPIFY_DOMAIN || !API_VERSION || !ADMIN_TOKEN) {
  throw new Error('❌ 缺少环境变量（SHOPIFY_DOMAIN、API_VERSION、ADMIN_TOKEN）');
}

const endpoint = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

const sampleReviews = [
  {
    author: "Alice W.",
    rating: 5,
    content: "Absolutely love the design and comfort. Highly recommend!",
  },
  {
    author: "Ben K.",
    rating: 4,
    content: "Solid build and elegant finish. Delivery was quick too.",
  },
  {
    author: "Cindy L.",
    rating: 5,
    content: "Perfect chair for my study room. Looks amazing in velvet!",
  },
];

// 替换成你实际的产品 ID（注意是产品 ID，不是 variant ID）
const productId = "gid://shopify/Product/8541720738052";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildMetafieldValue(reviews) {
  return JSON.stringify(reviews);
}

async function shopifyAdminFetch(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
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

const UPSERT_METAFIELD_QUERY = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        metafields(first: 5) {
          edges {
            node {
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: 'OK' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: 'Method Not Allowed',
    };
  }

  try {
    const metafieldValue = buildMetafieldValue(sampleReviews);

    const input = {
      id: productId,
      metafields: [
        {
          namespace: "custom",
          key: "reviews",
          type: "json",
          value: metafieldValue,
        },
      ],
    };

    const result = await shopifyAdminFetch(UPSERT_METAFIELD_QUERY, { input });

    if (result?.productUpdate?.userErrors?.length) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: result.productUpdate.userErrors }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: '✅ Seeded reviews successfully' }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || 'Server error' }),
    };
  }







}; 