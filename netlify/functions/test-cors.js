// netlify/functions/test-cors.js

export async function handler(event) {
  const ALLOWED_ORIGINS = [
    'https://netlifyabc.github.io',   // 你的前端地址
    'https://my-netlify-pro.netlify.app',
  ];

  const origin = event.headers.origin || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'CORS test successful',
      method: event.httpMethod,
      origin,
    }),
  };
} 