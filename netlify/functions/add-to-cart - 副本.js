const { createCartWithItem } = require('../../lib/shopify');

exports.handler = async function(event, context) {
  // 允许跨域预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // 生产环境可改成具体域名
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  // 统一响应头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // 解析请求体
    const { merchandiseId, quantity } = JSON.parse(event.body);

    if (!merchandiseId || !quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing merchandiseId or quantity' }),
      };
    }

    // 调用 Shopify API 创建购物车并添加商品
    const result = await createCartWithItem(merchandiseId, quantity);

    // 返回 Shopify 用户错误信息
    if (result.userErrors && result.userErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ errors: result.userErrors }),
      };
    }

    // 成功响应购物车数据
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, cart: result.cart }),
    };
  } catch (err) {
    // 打印详细错误日志，方便排查
    console.error('Error in Netlify function /add-to-cart:', err.stack || err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'Unknown error',
      }),
    };
  }
};
