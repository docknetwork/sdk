const axios = require('axios');

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

// Create axios instance with authentication
const jiraClient = axios.create({
  baseURL: JIRA_BASE_URL,
  headers: {
    Authorization: `Basic ${Buffer.from(
      `${JIRA_EMAIL}:${JIRA_API_KEY}`,
    ).toString('base64')}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

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

    const response = await jiraClient.post('/issue', ticketData);

    const createdTicket = response.data;

    console.log('Bug created successfully!');
    console.log(`\nTicket Key: ${createdTicket.key}`);
    console.log(`Ticket ID: ${createdTicket.id}`);

    // Transition ticket to "Ready for Dev"
    try {
      const transitionsResponse = await jiraClient.get(
        `/issue/${createdTicket.key}/transitions`,
      );
      const { transitions } = transitionsResponse.data;

      // Find "Ready for Dev" transition
      const readyForDevTransition = transitions.find(
        (t) => t.name === 'Ready for Dev' || t.to.name === 'Ready for Dev',
      );

      if (readyForDevTransition) {
        await jiraClient.post(`/issue/${createdTicket.key}/transitions`, {
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
        transitionError.response?.data || transitionError.message,
      );
    }

    console.log(`URL: https://${JIRA_DOMAIN}/browse/${createdTicket.key}`);

    return createdTicket;
  } catch (error) {
    console.error('Error creating Jira ticket:');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Full response data:');
      console.error(JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.error(
          '\nAuthentication failed. Please check your credentials.',
        );
      } else if (error.response.status === 400) {
        console.error(
          '\nBad request. Check if the project key and issue type are correct.',
        );
      } else if (error.response.status === 404) {
        console.error('\nProject not found. Please check the project key.');
      }
    } else if (error.request) {
      console.error(
        'No response received from Jira. Check your network connection.',
      );
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }

  return null;
}

// Run the bot
createTicket();
