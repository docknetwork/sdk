import credentialsContext from 'credentials-context';

import vcExamplesV1 from './contexts/vc-examples-v1';
import odrl from './contexts/odrl';
import schema from './contexts/schema.json';

export default new Map([
  ...credentialsContext.contexts,
  [
    'https://www.w3.org/2018/credentials/examples/v1',
    vcExamplesV1
  ],
  [
    'https://www.w3.org/ns/odrl.jsonld',
    odrl
  ],
  [
    'http://schema.org',
    schema
  ]
]);
