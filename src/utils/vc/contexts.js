import vcExamplesV1 from './contexts/vc-examples-v1';
import ed25519V1Context from './contexts/ed25519-2020-v1-context.json';
import sr25519Context from './contexts/sr25519-context.json';
import secContext from './contexts/security_context';
import secContextV1 from './contexts/security-v1.json';
import didV1Context from './contexts/did-v1-updated.json';
import credV1Context from './contexts/credential-v1-updated.json';
import schema from './contexts/schema.json';
import odrl from './contexts/odrl.json';
import bbsV1Context from './contexts/bbs-v1.json';
import dockBBSV1Context from './contexts/dock-bbs-v1.json';
import dockBBS23V1Context from './contexts/dock-bbs23-v1.json';
import dockPSV1Context from './contexts/dock-ps-v1.json';
import dockPrettyVCContext from './contexts/prettyvc.json';
import jws2020V1Context from './contexts/jws-2020-v1.json';
import statusList21Context from './contexts/status-list-21';
import privateStatusList21Context from './contexts/private-status-list-21';

// Lookup of following URLs will lead to loading data from the context directory, this is done as the Sr25519 keys are not
// supported in any W3C standard and vc-js has them stored locally. This is a temporary solution.
export default new Map([
  [
    'https://ld.dock.io/credentials/prettyvc',
    dockPrettyVCContext,
  ],
  [
    'https://ld.dock.io/security/bbs/v1',
    dockBBSV1Context,
  ],
  [
    'https://ld.dock.io/security/bbs23/v1',
    dockBBS23V1Context,
  ],
  [
    'https://ld.dock.io/security/ps/v1',
    dockPSV1Context,
  ],
  [
    'https://w3id.org/security/bbs/v1',
    bbsV1Context,
  ],
  [
    'https://w3c-ccg.github.io/ldp-bbs2020/contexts/v1/',
    bbsV1Context,
  ],
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
    'https://w3id.org/did/v0.11',
    didV1Context,
  ],
  [
    'https://www.w3.org/ns/did/v1',
    didV1Context,
  ],
  [
    'https://w3id.org/security/suites/ed25519-2020/v1',
    ed25519V1Context,
  ],
  [
    'https://w3id.org/security/suites/jws-2020/v1',
    jws2020V1Context,
  ],
  // This is overridden because the URL is 404 now, likely because domain name change. But the status-list library still uses the old domain name
  [
    'https://w3id.org/vc/status-list/2021/v1',
    statusList21Context,
  ],
  [
    'https://ld.dock.io/private-status-list-21',
    privateStatusList21Context,
  ],
]);
