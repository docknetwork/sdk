const FullNodeEndpoint = 'ws://localhost:9944'; // TODO: make an environment variable or something?
const TestKeyringOpts = {type: 'sr25519'};
const TestAccount = {uri: '//Alice', options: {name: 'Alice'}};

export {
  FullNodeEndpoint,
  TestKeyringOpts,
  TestAccount
};
