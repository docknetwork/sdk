const FULL_NODE_ENDPOINT = 'ws://localhost:9944'; // TODO: make an environment variable or something?
const TEST_KEYRING_OPTS = {type: 'sr25519'};
const TEST_ACCOUNT = {uri: '//Alice', options: {name: 'Alice'}};

export {
  FULL_NODE_ENDPOINT,
  TEST_KEYRING_OPTS,
  TEST_ACCOUNT
};
