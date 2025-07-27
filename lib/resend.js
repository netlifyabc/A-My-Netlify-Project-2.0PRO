// lib/resend.js - 正式版，调用 Resend API 发送邮件

import fetch from 'node-fetch';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

if (!RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY in environment variables');
}
if (!FROM_EMAIL) {
  throw new Error('Missing FROM_EMAIL in environment variables');
}

export async function sendVerificationEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Resend API error:', errorText);
    throw new Error(`Failed to send email: ${errorText}`);
  }

  const data = await res.json();
  return {
    success: true,
    message: '邮件发送成功',
    data,
  };
} 







 