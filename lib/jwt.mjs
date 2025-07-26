// netlify/functions/auth/jwt.mjs

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

/**
 * 生成 JWT
 * @param {Object} payload - 载荷数据
 * @param {string|number} expiresIn - 过期时间，如 '7d', '1h' 或秒数
 * @returns {string} JWT 字符串
 */
export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * 验证 JWT
 * @param {string} token - JWT 字符串
 * @returns {Object|null} 解码的载荷，如果无效则返回 null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // 可以根据需求扩展不同错误处理，比如过期、签名错误等
    return null;
  }
} 