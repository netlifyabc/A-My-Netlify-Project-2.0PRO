// netlify/functions/add-to-cart.js

const { createCartWithItem } = require('../../lib/shopify');

exports.handler = async function(event) {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

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

    // 调用你的 Shopify 创建购物车并添加商品方法
    const result = await createCartWithItem(merchandiseId, quantity);

    // 处理 Shopify 返回的用户错误
    if (result.userErrors && result.userErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ errors: result.userErrors }),
      };
    }

    // 成功返回购物车数据
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.cart),
    };
  } catch (err) {
    console.error('Error in add-to-cart function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server Error', details: err.message }),
    };
  }
};
