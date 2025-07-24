import { useState, useCallback } from 'react';

export default function CombinedShopifyCartFlow() {
  const [cartId, setCartId] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [cart, setCart] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const logMessage = (msg) => setLog((prev) => [...prev, msg]);

  const getCart = useCallback(async () => {
    if (!cartId) {
      logMessage('❌ 缺少 cartId');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/get-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId }),
      });
      const data = await res.json();
      if (data.error) {
        logMessage(`❌ 获取购物车失败: ${JSON.stringify(data.error)}`);
        setLoading(false);
        return;
      }
      setCart(data);
      logMessage(`📦 获取购物车:\n${JSON.stringify(data.lines?.edges || [], null, 2)}`);
    } catch (e) {
      logMessage(`❌ 获取失败: ${e.message}`);
    }
    setLoading(false);
  }, [cartId]);

  const addToCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/add-to-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchandiseId: 'gid://shopify/ProductVariant/54634094526788',
          quantity: 1,
        }),
      });
      const data = await res.json();
      if (data.error || data.errors) {
        logMessage(`❌ 添加商品失败: ${JSON.stringify(data.error || data.errors)}`);
      } else {
        const rawLineId = data.items?.[0]?.node?.id || data.lines?.edges?.[0]?.node?.id || '';
        const cleanCartId = (data.cartId || data.id || '').split('?')[0];
        setCartId(cleanCartId);
        setCheckoutUrl(data.checkoutUrl || '');
        setCart(data);
        logMessage(`✅ 添加商品\nCart ID: ${cleanCartId}\nLine ID: ${rawLineId.split('?')[0]}`);
      }
    } catch (e) {
      logMessage(`❌ 添加商品异常: ${e.message}`);
    }
    setLoading(false);
  }, []);

  const updateCart = useCallback(async () => {
    if (!cartId || !cart?.lines?.edges?.length) {
      logMessage('❌ 无可更新项');
      return;
    }
    const line = cart.lines.edges[0].node;
    setLoading(true);
    try {
      const res = await fetch('/api/update-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, lineId: line.id.split('?')[0], quantity: 3 }),
      });
      const data = await res.json();
      if (data.error) {
        logMessage(`❌ 修改失败: ${JSON.stringify(data.error)}`);
        setLoading(false);
        return;
      }
      // 变更后重新获取购物车数据，保证最新状态
      await getCart();
      logMessage(`🔁 修改数量成功\n数量: 3`);
    } catch (e) {
      logMessage(`❌ 修改失败: ${e.message}`);
    }
    setLoading(false);
  }, [cartId, cart, getCart]);

  const removeFromCart = useCallback(async () => {
    if (!cartId || !cart?.lines?.edges?.length) {
      logMessage('❌ 无可删除项');
      return;
    }
    const line = cart.lines.edges[0].node;
    setLoading(true);
    try {
      const res = await fetch('/api/remove-from-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, lineId: line.id.split('?')[0] }),
      });
      const data = await res.json();
      if (data.error) {
        logMessage(`❌ 删除失败: ${JSON.stringify(data.error)}`);
        setLoading(false);
        return;
      }
      await getCart();
      logMessage(`🗑️ 删除成功`);
    } catch (e) {
      logMessage(`❌ 删除失败: ${e.message}`);
    }
    setLoading(false);
  }, [cartId, cart, getCart]);

  const goCheckout = () => {
    if (!checkoutUrl) {
      logMessage('❌ 缺少 checkoutUrl');
      return;
    }
    window.open(checkoutUrl, '_blank');
  };

  const handleUpdateQuantity = async (lineId, quantity) => {
    if (!cartId) {
      logMessage('❌ 缺少 cartId，无法修改数量');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/update-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, lineId: lineId.split('?')[0], quantity }),
      });
      const data = await res.json();
      if (data.error) {
        logMessage(`❌ 修改失败: ${JSON.stringify(data.error)}`);
        setLoading(false);
        return;
      }
      await getCart();
      logMessage(`📝 修改数量成功: ${quantity}`);
    } catch (e) {
      logMessage(`❌ 修改失败: ${e.message}`);
    }
    setLoading(false);
  };

  const handleRemove = async (lineId) => {
    if (!cartId) {
      logMessage('❌ 缺少 cartId，无法删除');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/remove-from-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, lineId: lineId.split('?')[0] }),
      });
      const data = await res.json();
      if (data.error) {
        logMessage(`❌ 删除失败: ${JSON.stringify(data.error)}`);
        setLoading(false);
        return;
      }
      await getCart();
      logMessage(`🗑️ 删除成功`);
    } catch (e) {
      logMessage(`❌ 删除失败: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', maxWidth: 1000, margin: '2rem auto', gap: 40, fontFamily: 'sans-serif' }}>
      {/* 左侧测试区 */}
      <section style={{ flex: 1 }}>
        <h2>🧪 Shopify Cart Flow Simulator</h2>
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={addToCart} disabled={loading}>🛒 添加商品</button>{' '}
          <button onClick={updateCart} disabled={loading}>🔁 修改数量</button>{' '}
          <button onClick={getCart} disabled={loading}>📦 查询购物车</button>{' '}
          <button onClick={removeFromCart} disabled={loading}>❌ 删除商品</button>{' '}
          <button onClick={goCheckout} disabled={loading}>💳 去结账</button>
        </div>
        <pre style={{
          background: '#f0f0f0',
          padding: '1rem',
          borderRadius: 6,
          fontSize: '0.85rem',
          maxHeight: 300,
          overflowY: 'auto'
        }}>
          {log.map((m, i) => <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{m}</div>)}
        </pre>
      </section>

      {/* 右侧可视化购物车 */}
      <section style={{ flex: 1 }}>
        <h2>🛒 当前购物车内容（可视化）</h2>
        {cart?.lines?.edges?.length > 0 ? (
          cart.lines.edges.map(({ node }) => (
            <div
              key={node.id}
              style={{
                borderBottom: '1px solid #ddd',
                padding: '0.5rem 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong>{node.merchandise.title}</strong>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  ID: <small>{node.id.split('?')[0]}</small>
                </div>
              </div>
              <div>
                数量:
                <input
                  type="number"
                  min="1"
                  defaultValue={node.quantity}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0 && val !== node.quantity) {
                      handleUpdateQuantity(node.id, val);
                    }
                  }}
                  style={{ width: 60, margin: '0 12px' }}
                  disabled={loading}
                />
                <button
                  onClick={() => handleRemove(node.id)}
                  disabled={loading}
                  style={{
                    background: 'red',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        ) : (

                    <p>🕳️ 购物车是空的</p>
        )}
      </section>
    </div>
  );
}
