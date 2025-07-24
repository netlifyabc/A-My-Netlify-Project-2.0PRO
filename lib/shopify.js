const endpoint = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/${process.env.SHOPIFY_API_VERSION}/graphql.json`;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_API_VERSION || !token) {
  throw new Error('Missing one or more required Shopify environment variables');
}

async function shopifyFetch(query, variables) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Network error:', res.status, text);
    throw new Error(`Network error: ${res.status}`);
  }

  const json = await res.json();

  if (json.errors) {
    console.error('Shopify GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL Error from Shopify');
  }

  if (!json.data) {
    console.error('No data returned from Shopify:', JSON.stringify(json, null, 2));
    throw new Error('Missing data in Shopify response');
  }

  return json.data;
}

// ✅ 创建购物车并添加商品
async function createCartWithItem(merchandiseId, quantity) {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
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
async function getCart(cartId) {
  const query = `
    query getCart($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
        }
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
async function updateCartLine(cartId, lineId, quantity) {
  const query = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
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
async function removeCartLine(cartId, lineId) {
  const query = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
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

// ✅ 向已有购物车添加商品（新增购物车行）
async function addCartLine(cartId, merchandiseId, quantity) {
  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
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

module.exports = {
  shopifyFetch, // <--- 这个之前没导出，导致 require 后不是函数 
  createCartWithItem,
  getCart,
  updateCartLine,
  removeCartLine,
  addCartLine,
};


console.log('shopifyFetch exported:', typeof shopifyFetch); 





