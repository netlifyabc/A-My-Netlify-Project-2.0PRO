const { shopifyFetch } = require('../../lib/shopify');

exports.handler = async function() {
  const query = `
    {
      shop {
        name
      }
    }
  `;

  try {
    const data = await shopifyFetch(query);
    return {
      statusCode: 200,
      body: JSON.stringify({ shopName: data.shop.name }),
    };
  } catch (error) {
    console.error('Error in test-shopify:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
