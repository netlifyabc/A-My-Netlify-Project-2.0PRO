export async function handler(event) {
  const origin = event.headers.origin || '*';

  const headers = {
    'Access-Control-Allow-Origin': origin,  // 允许跨域访问的域名
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'CORS test successful',
        method: event.httpMethod,
        origin,
        received: data,
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON' }),
    };
  }
}
