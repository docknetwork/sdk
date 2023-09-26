import { verifyCredential } from '../../src/utils/vc/index';
import defaultDocumentLoader from '../../src/utils/vc/document-loader';
import didDocument from '../data/static-did-dock.json';
import staticCred610 from '../data/static-bbs-cred-610.json';
// import staticCred630 from '../data/static-bbs-cred-630.json'; // TODO: add a credential from 6.3.0

const loadDocumentDefault = defaultDocumentLoader(null);

async function documentLoader(doc) {
  if (doc.startsWith(staticCred610.issuer.id)) {
    return {
      contextUrl: null,
      documentUrl: doc,
      document: didDocument,
    };
  }

  return loadDocumentDefault(doc);
}

describe('Static BBS+ Credential Verification (backwards compatibility)', () => {
  test('verifies BBS+ credential from SDK 6.1.0', async () => {
    const result = await verifyCredential(staticCred610, {
      documentLoader,
    });
    console.error(JSON.stringify(result, null, 2));
    expect(result.verified).toBe(true);
  });

  // test('verifies BBS+ credential from SDK 6.3.0', async () => {
  //   const result = await verifyCredential(staticCred630, {
  //     documentLoader,
  //   });
  //   console.error(JSON.stringify(result, null, 2));
  //   expect(result.verified).toBe(true);
  // });
});
