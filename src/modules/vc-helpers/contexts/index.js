const credentialsContext = require('credentials-context');

export default new Map([
  ...credentialsContext.contexts,
  [
    'https://www.w3.org/2018/credentials/examples/v1',
    require('./vc-examples-v1')
  ],
  [
    'https://www.w3.org/ns/odrl.jsonld',
    require('./odrl')
  ],
  [
    'http://schema.org',
    require('./schema')
  ]
]);
