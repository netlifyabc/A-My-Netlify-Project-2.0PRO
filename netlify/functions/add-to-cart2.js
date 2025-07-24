// netlify/functions/add-to-cart.js
const { createCartWithItem } = require('../../lib/shopify');

exports.handler = async function(event, context) {
  // 处理 CORS 预检请求（OPTIONS）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // 或者指定前端域名
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // 仅允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  // 设置跨域响应头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { merchandiseId, quantity } = JSON.parse(event.body);

    if (!merchandiseId || !quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing merchandiseId or quantity' }),
      };
    }

    const result = await createCartWithItem(merchandiseId, quantity);

    if (result.userErrors?.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ errors: result.userErrors }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.cart),
    };
  } catch (err) {
    console.error('Error in Netlify function /add-to-cart:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server Error' }),
    };
  }
};


