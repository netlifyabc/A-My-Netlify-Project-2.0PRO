import { verifyToken } from '../../lib/jwt.mjs';

const adminEndpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${process.env.SHOPIFY_API_VERSION}/orders.json`;
const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_API_VERSION || !adminToken) {
  throw new Error('Missing Shopify Admin API environment variables');
}

export default async (req, res) => {
  // ✅ 检查是否为 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ✅ 检查 Authorization Header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const user = verifyToken(token);

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(adminEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Shopify Admin API error:', text);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    const data = await response.json();

    // ✅ 可以自定义过滤/格式化字段
    const orders = data.orders.map(order => ({
      id: order.id,
      name: order.name,
      email: order.email,
      total: order.total_price,
      currency: order.currency,
      createdAt: order.created_at,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status
    }));

    return res.status(200).json({ orders });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}; 


