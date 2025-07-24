exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

  if (!SHOP_DOMAIN || !STOREFRONT_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Shopify credentials' }),
    };
  }

  const query = `
    {
      shop {
        name
      }
    }
  `;

  try {
    const response = await fetch(`https://${SHOP_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Shopify API request failed', details: text }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fetch failed', details: error.message }),
    };
  }
};

