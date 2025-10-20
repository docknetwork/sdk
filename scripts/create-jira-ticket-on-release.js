const https = require('https');
const { URL } = require('url');

// Jira configuration
const { JIRA_API_KEY } = process.env;
const { JIRA_EMAIL } = process.env;
const { JIRA_DOMAIN } = process.env;

// Validate required environment variables
if (!JIRA_API_KEY || !JIRA_EMAIL || !JIRA_DOMAIN) {
  console.error('Error: Missing required environment variables.');
  console.error(
    'Please ensure JIRA_API_KEY, JIRA_EMAIL, and JIRA_DOMAIN are set in .env file',
  );
  process.exit(1);
}

// Create base URL for Jira API
const JIRA_BASE_URL = `https://${JIRA_DOMAIN}/rest/api/3`;

// Create authentication header
const authHeader = `Basic ${Buffer.from(
  `${JIRA_EMAIL}:${JIRA_API_KEY}`,
).toString('base64')}`;

/**
 * Make an HTTPS request to the Jira API
 * @param {string} path - API endpoint path
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object|null} body - Request body (will be JSON stringified)
 * @returns {Promise<object>} Response data
 */
function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, JIRA_BASE_URL);
    const bodyData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (bodyData) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            const error = new Error(`HTTP ${res.statusCode}`);
            error.status = res.statusCode;
            error.response = parsedData;
            reject(error);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (bodyData) {
      req.write(bodyData);
    }

    req.end();
  });
}

/**
 * Create a new Jira ticket in the DCKA project
 */
async function createTicket() {
  try {
    console.log('Creating new Jira bug...\n');

    const ticketData = {
      fields: {
        project: {
          key: 'DCKA',
        },
        summary: 'Update the Credential SDK version in the wallet',
        issuetype: {
          // We create a bug ticket so that it will appear in the escalations board
          id: '10004', // Bug
        },
        components: [
          {
            id: '10022', // Wallet SDK
          },
        ],
      },
    };

    const createdTicket = await makeRequest('/issue', 'POST', ticketData);

    console.log('Bug created successfully!');
    console.log(`\nTicket Key: ${createdTicket.key}`);
    console.log(`Ticket ID: ${createdTicket.id}`);

    // Transition ticket to "Ready for Dev"
    try {
      const transitionsResponse = await makeRequest(
        `/issue/${createdTicket.key}/transitions`,
        'GET',
      );
      const { transitions } = transitionsResponse;

      // Find "Ready for Dev" transition
      const readyForDevTransition = transitions.find(
        (t) => t.name === 'Ready for Dev' || t.to.name === 'Ready for Dev',
      );

      if (readyForDevTransition) {
        await makeRequest(`/issue/${createdTicket.key}/transitions`, 'POST', {
          transition: {
            id: readyForDevTransition.id,
          },
        });
        console.log('Status updated to: Ready for Dev');
      } else {
        console.log('Warning: Could not find "Ready for Dev" transition');
        console.log(
          'Available transitions:',
          transitions.map((t) => t.name).join(', '),
        );
      }
    } catch (transitionError) {
      console.log(
        'Warning: Could not transition ticket:',
        transitionError.response || transitionError.message,
      );
    }

    console.log(`URL: https://${JIRA_DOMAIN}/browse/${createdTicket.key}`);

    return createdTicket;
  } catch (error) {
    console.error('Error creating Jira ticket:');

    if (error.status) {
      console.error(`Status: ${error.status}`);
      console.error('Full response data:');
      console.error(JSON.stringify(error.response, null, 2));

      if (error.status === 401) {
        console.error(
          '\nAuthentication failed. Please check your credentials.',
        );
      } else if (error.status === 400) {
        console.error(
          '\nBad request. Check if the project key and issue type are correct.',
        );
      } else if (error.status === 404) {
        console.error('\nProject not found. Please check the project key.');
      }
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }

  return null;
}

// Run the bot
createTicket();
