import { sendVerificationEmail } from '../../lib/resend.js';
import jwt from 'jsonwebtoken';

const ALLOWED_ORIGIN = 'https://netlifyabc.github.io';
const JWT_SECRET = process.env.JWT_SECRET;
const FROM_EMAIL = process.env.FROM_EMAIL;
const VERIFY_REDIRECT_URL = process.env.VERIFY_REDIRECT_URL;

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { email, firstName, customerId } = JSON.parse(event.body);

    if (!email || !customerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // 重新生成新的验证 token
    const token = jwt.sign(
      { customerId, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const verifyUrl = `${VERIFY_REDIRECT_URL}?token=${encodeURIComponent(token)}`;

    const html = `
      <p>Hi ${firstName || ''},</p>
      <p>您请求重新发送验证邮件，请点击以下链接完成邮箱验证：</p>
      <a href="${verifyUrl}">验证邮箱</a>
      <p>该链接7天内有效。</p>
    `;

    await sendVerificationEmail({
      from: FROM_EMAIL,
      to: email,
      subject: '重新发送：请验证您的邮箱地址',
      html,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Verification email resent' }),
    };
  } catch (error) {
    console.error('resend-verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
} 


