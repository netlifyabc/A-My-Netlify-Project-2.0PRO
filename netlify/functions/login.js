// 登录用户并获取 access token
const { shopifyFetch } = require('../../lib/shopify');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: '缺少邮箱或密码' }) };
    }

    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken { accessToken expiresAt }
          customerUserErrors { field message }
        }
      }`;
    const variables = { input: { email, password } };

    const data = await shopifyFetch(mutation, variables);
    const result = data.customerAccessTokenCreate;

    if (result.customerUserErrors.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ errors: result.customerUserErrors })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ token: result.customerAccessToken })
    };
  } catch (err) {
    console.error('login error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server Error' }) };
  }
};








