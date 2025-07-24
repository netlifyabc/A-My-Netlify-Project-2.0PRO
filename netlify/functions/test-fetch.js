const fetch = require('node-fetch');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION;
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

exports.handler = async () => {
  // 打印环境变量状态（不打印敏感 token 内容）
  console.log('🧪 ENV CHECK:', {
    SHOPIFY_STORE_DOMAIN: SHOPIFY_DOMAIN,
    SHOPIFY_API_VERSION: API_VERSION,
    HAS_TOKEN: !!TOKEN,
  });

  // 如果环境变量缺失，直接返回错误
  if (!SHOPIFY_DOMAIN || !API_VERSION || !TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '❌ Missing one or more required environment variables.' }),
    };
  }

  const endpoint = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

  // 示例：添加一个商品到购物车
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lines: [
        {
          merchandiseId: "gid://shopify/ProductVariant/54634094526788", // 👈 替换为你的 variant ID
          quantity: 1,
        },
      ],
    },
  };

  // 构造请求
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  };

  console.log('🔗 Fetching:', endpoint);
  console.log('📦 Payload:', JSON.stringify({ query, variables }, null, 2));

  try {
    const res = await fetch(endpoint, options);

    const text = await res.text();
    console.log('📥 Raw Response:', text);

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: '❌ HTTP error', status: res.status, body: text }),
      };
    }

    const json = JSON.parse(text);

    if (json.errors) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: '❌ Shopify GraphQL error', details: json.errors }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: json.data }),
    };
  } catch (err) {
    console.error('❌ Fetch exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '❌ Network or fetch error', message: err.message }),
    };
  }
};
