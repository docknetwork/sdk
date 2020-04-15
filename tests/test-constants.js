// The constants below are used for examples and tests

require('dotenv').config();

const DefaultFullNodeEndpoint = 'ws://localhost:9944';
const DefaultTestKeyringType = 'sr25519';
const DefaultTestAccountURI = '//Alice';

/**
 * Read variable from environment or use the default value
 * @param varName - The variable name to read from environment variable
 * @param defaultVal - The default value if the variable is not found in environment.
 * @returns {string|*}
 */
function fromEnv(varName, defaultVal) {
  if (varName in process.env) {
    return process.env[varName];
  }
  if (defaultVal !== undefined) {
    return defaultVal;
  }
  throw new Error(`Environment variable "${varName}" not defined`);
}

export const FullNodeEndpoint = fromEnv('FullNodeEndpoint', DefaultFullNodeEndpoint);
export const TestKeyringOpts = { type: fromEnv('TestKeyringType', DefaultTestKeyringType) };
export const TestAccountURI = fromEnv('TestAccountURI', DefaultTestAccountURI);
