const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { firstName, lastName, email, password } = JSON.parse(event.body);

    if (!firstName || !lastName || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const SHOP_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // 你的店铺域名，如 yourstore.myshopify.com
    const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN; // 你的 Admin API 访问令牌

    // GraphQL mutation 创建客户
    const query = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
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
        firstName,
        lastName,
        email,
        password,
        acceptsMarketing: false
      },
    };

    const response = await fetch(`https://${SHOP_DOMAIN}/admin/api/2023-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    // 处理可能的错误
    if (result.errors) {
      // GraphQL 错误
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Shopify API error', details: result.errors }),
      };
    }

    const userErrors = result.data.customerCreate.userErrors;
    if (userErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User input error', details: userErrors }),
      };
    }

    // 注册成功，返回客户信息
    const customer = result.data.customerCreate.customer;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Customer created successfully',
        customer,
      }),
    };
  } catch (error) {
    console.error('Error in register function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};


