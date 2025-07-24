exports.handler = async () => {
  try {
    const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
    const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
    
    console.log('SHOP_DOMAIN:', SHOP_DOMAIN);
    console.log('TOKEN:', STOREFRONT_TOKEN ? '****' : 'NOT SET');
    
    const res = await fetch(`https://${SHOP_DOMAIN}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: '{ shop { name } }' }),
    });

    const json = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ data: json }),
    };
  } catch (error) {
    console.error('Fetch test error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'fetch failed', details: error.message }),
    };
  }
};
