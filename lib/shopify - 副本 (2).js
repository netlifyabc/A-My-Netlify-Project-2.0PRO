const endpoint = `https://${process.env.SHOPIFY_DOMAIN}/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

// 🛠️ 通用 fetch 函数（已添加错误处理）
async function shopifyFetch(query, variables) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();

  // ✅ 输出 GraphQL 错误信息
  if (json.errors) {
    console.error('❌ Shopify GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL Error from Shopify');
  }

  // ✅ 确保返回 data
  if (!json.data) {
    console.error('❌ No data returned from Shopify:', JSON.stringify(json, null, 2));
    throw new Error('Missing data in Shopify response');
  }

  return json.data;
}

// ✅ 创建购物车并添加商品
export async function createCartWithItem(merchandiseId, quantity) {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lines: [{ merchandiseId, quantity }]
    }
  };

  const data = await shopifyFetch(query, variables);
  return data.cartCreate;
}

// ✅ 获取购物车内容
export async function getCart(cartId) {
  const query = `
    query getCart($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        lines(first: 10) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { id: cartId };
  const data = await shopifyFetch(query, variables);
  return data.cart;
}

// ✅ 修改购物车商品数量
export async function updateCartLine(cartId, lineId, quantity) {
  const query = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId,
    lines: [{ id: lineId, quantity }]
  };

  const data = await shopifyFetch(query, variables);
  return data.cartLinesUpdate;
}

// ✅ 删除购物车中的商品
export async function removeCartLine(cartId, lineId) {
  const query = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId,
    lineIds: [lineId]
  };

  const data = await shopifyFetch(query, variables);
  return data.cartLinesRemove;
}

// ...前面已有的代码

// ✅ 向已有购物车添加商品（新增购物车行）
export async function addCartLine(cartId, merchandiseId, quantity) {
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId,
    lines: [{ merchandiseId, quantity }]
  };

  const data = await shopifyFetch(query, variables);
  return data.cartLinesAdd;
}


