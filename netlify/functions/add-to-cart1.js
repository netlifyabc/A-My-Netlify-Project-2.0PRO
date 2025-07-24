// netlify/functions/add-to-cart.js

exports.handler = async function(event, context) {
  // 处理 CORS 预检请求（OPTIONS）
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
    const body = JSON.parse(event.body);
    // 简单验证下是否收到数据
    if (!body.merchandiseId || !body.quantity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'merchandiseId or quantity missing' }),
      };
    }

    // 模拟业务处理，直接返回接收到的数据，方便调试
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Add to cart function received data successfully',
        data: body,
      }),
    };
  } catch (error) {
    console.error('Error parsing body or processing request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server Error', details: error.message }),
    };
  }
};
