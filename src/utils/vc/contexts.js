import vcExamplesV1 from './contexts/vc-examples-v1';
import ed25519V1Context from './contexts/ed25519-2020-v1-context.json';
import sr25519Context from './contexts/sr25519-context.json';
import secContext from './contexts/security_context';
import secContextV1 from './contexts/security-v1.json';
import didV1Context from './contexts/did-v1-updated.json';
import credV1Context from './contexts/credential-v1-updated.json';
import schema from './contexts/schema.json';
import odrl from './contexts/odrl.json';

// Lookup of following URLs will lead to loading data from the context directory, this is done as the Sr25519 keys are not
// supported in any W3C standard and vc-js has them stored locally. This is a temporary solution.
export default new Map([
  [
    'https://www.w3.org/2018/credentials/v1',
    credV1Context,
  ],
  [
    'https://www.w3.org/2018/credentials/examples/v1',
    vcExamplesV1,
  ],
  [
    'https://www.w3.org/ns/odrl.jsonld',
    odrl,
  ],
  [
    'https://schema.org',
    schema,
  ],
  [
    'http://schema.org',
    schema,
  ],
  [
    'https://www.dock.io/2020/credentials/context/sr25519',
    sr25519Context,
  ],
  [
    'https://w3id.org/security/v1',
    secContextV1,
  ],
  [
    'https://w3id.org/security/v2',
    secContext,
  ],
  [
    'https://www.w3.org/ns/did/v1',
    didV1Context,
  ],
  [
    'https://w3id.org/security/suites/ed25519-2020/v1',
    ed25519V1Context,
  ],
]);
