// lib/resend.js - 模拟发送邮件版本，开发调试用

export async function sendVerificationEmail({ to, subject, html }) {
  console.log('模拟发送邮件：');
  console.log('收件人:', to);
  console.log('主题:', subject);
  console.log('内容:', html);

  // 模拟异步等待
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    message: '模拟邮件发送成功',
  };
}  