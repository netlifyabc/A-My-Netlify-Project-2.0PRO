import { sendVerificationEmail } from '../../lib/resend.js';  // 你封装的 Resend 调用
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
    const { email, firstName, lastName, customerId } = JSON.parse(event.body);

    if (!email || !customerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // 生成验证 JWT，7天有效期
    const token = jwt.sign(
      { customerId, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 验证链接，客户点击后跳转到 verify-email 处理的 endpoint，携带 token
    const verifyUrl = `${VERIFY_REDIRECT_URL}?token=${encodeURIComponent(token)}`;

    // 邮件内容（HTML）
    const html = `
      <p>Hi ${firstName || ''},</p>
      <p>请点击以下链接验证您的邮箱地址：</p>
      <a href="${verifyUrl}">验证邮箱</a>
      <p>该链接7天内有效。</p>
    `;

    // 调用封装的 Resend API 发送邮件
    await sendVerificationEmail({
      from: FROM_EMAIL,
      to: email,
      subject: '请验证您的邮箱地址',
      html,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Verification email sent' }),
    };
  } catch (error) {
    console.error('send-email-verify error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
} 