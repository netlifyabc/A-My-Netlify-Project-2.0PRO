const { createCartWithItem } = require('../../lib/shopify');

// 辅助函数：统一设置 CORS 响应头
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // 生产环境建议改为指定域名
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

exports.handler = async function(event, context) {
  // 处理 CORS 预检请求（OPTIONS）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: '',
    };
  }

  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const headers = getCorsHeaders();

  try {
    // 解析请求体
    const { merchandiseId, quantity } = JSON.parse(event.body);

    // 简单参数校验
    if (!merchandiseId || !quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing merchandiseId or quantity' }),
      };
    }

    // 调用 Shopify 创建购物车并添加商品
    const result = await createCartWithItem(merchandiseId, quantity);

    // 如果 Shopify 返回用户错误，直接返回给前端
    if (result.userErrors?.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ errors: result.userErrors }),
      };
    }

    // 返回成功的购物车信息
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
      body: JSON.stringify({
        error: 'Server Error',
        message: err.message,
        // 只有开发环境才返回堆栈信息，避免泄露
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      }),
    };
  }
};





