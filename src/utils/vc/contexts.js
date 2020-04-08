import credentialsContext from 'credentials-context';

import vcExamplesV1 from './contexts/vc-examples-v1';
import odrl from './contexts/odrl';
import schema from './contexts/schema.json';
import sr25519Context from './contexts/sr25519-context';
import secContext from './contexts/security_context';
import didV1Context from './contexts/did-v1-updated';
import credV1Context from './contexts/credential-v1-updated';

// Lookup of following URLs will lead to loading data from the context directory, this is done as the Sr25519 keys are not
// supported in any W3C standard and vc-js has them stored locally
export default new Map([
  ...credentialsContext.contexts,
  [
    'https://www.w3.org/2018/credentials/v1',
    credV1Context
  ],
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
  ],
  [
    'https://www.dock.io/2020/credentials/context/sr25519',
    sr25519Context
  ],
  [
    'https://w3id.org/security/v2',
    secContext
  ],
  [
    'https://www.w3.org/ns/did/v1',
    didV1Context
  ]
]);
