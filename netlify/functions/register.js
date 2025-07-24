// 注册新用户（customerCreate）
const { shopifyFetch } = require('../../lib/shopify');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { firstName, lastName, email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: '缺少邮箱或密码' }) };
    }

    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer { id email }
          customerUserErrors { field message }
        }
      }`;
    const variables = { input: { firstName, lastName, email, password, acceptsMarketing: false } };

    const data = await shopifyFetch(mutation, variables);
    const result = data.customerCreate;

    if (result.customerUserErrors.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ errors: result.customerUserErrors })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ customer: result.customer })
    };
  } catch (err) {
    console.error('register error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server Error' }) };
  }
};








