// netlify/functions/test-shopify.js

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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};



