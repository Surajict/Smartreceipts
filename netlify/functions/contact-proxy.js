exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get the n8n webhook URL from environment variables
    const n8nWebhookUrl = process.env.N8N_CONTACT_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      throw new Error('N8N webhook URL not configured');
    }

    // Parse the request body
    const requestData = JSON.parse(event.body);

    // Forward the request to n8n
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    // Get the response from n8n
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { success: true };
    }

    return {
      statusCode: response.ok ? 200 : response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error('Contact proxy error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
}; 