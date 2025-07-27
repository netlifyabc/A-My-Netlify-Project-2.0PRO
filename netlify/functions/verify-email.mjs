import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = process.env.JWT_SECRET;
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const VERIFY_REDIRECT_URL = process.env.VERIFY_REDIRECT_URL || '/verify-success.html';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*', // 可根据需求限制来源
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed, use GET' }),
    };
  }

  const queryParams = event.queryStringParameters || {};
  const token = queryParams.token;

  if (!token) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing token parameter' }),
    };
  }

  let payload;
  try {
    // 解密并验证 JWT
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }

  // payload 里应该包含 customer id
  const customerId = payload.id;
  if (!customerId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid token payload: missing customer id' }),
    };
  }

  // Shopify Admin API GraphQL endpoint
  const endpoint = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

  // 给客户添加“verified”标签的 GraphQL mutation
  // Shopify客户标签是数组，先查询已有标签然后加上verified再更新
  const getTagsQuery = `
    query getCustomerTags($id: ID!) {
      customer(id: $id) {
        id
        tags
      }
    }
  `;

  const addVerifiedTagMutation = `
    mutation updateCustomerTags($id: ID!, $tags: [String!]!) {
      customerUpdate(input: {id: $id, tags: $tags}) {
        customer {
          id
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    // 1. 查询已有标签
    const getTagsResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        query: getTagsQuery,
        variables: { id: customerId },
      }),
    });

    const getTagsResult = await getTagsResponse.json();

    if (getTagsResult.errors) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Shopify query error', details: getTagsResult.errors }),
      };
    }

    const customer = getTagsResult.data.customer;
    if (!customer) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Customer not found' }),
      };
    }

    let tags = customer.tags || [];
    if (!tags.includes('verified')) {
      tags.push('verified');
    }

    // 2. 更新标签
    const updateTagsResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
      },
      body: JSON.stringify({
        query: addVerifiedTagMutation,
        variables: { id: customerId, tags },
      }),
    });

    const updateTagsResult = await updateTagsResponse.json();

    if (updateTagsResult.errors) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Shopify update error', details: updateTagsResult.errors }),
      };
    }

    const userErrors = updateTagsResult.data.customerUpdate.userErrors;
    if (userErrors && userErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Shopify user errors', details: userErrors }),
      };
    }

    // 3. 成功，跳转到验证成功页面
    return {
      statusCode: 302,
      headers: {
        Location: VERIFY_REDIRECT_URL,
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };
  } catch (error) {
    console.error('verify-email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }


} 