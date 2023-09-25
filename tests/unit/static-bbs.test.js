import { verifyCredential } from '../../src/utils/vc/index';
import defaultDocumentLoader from '../../src/utils/vc/document-loader';
import didDocument from '../data/static-did-dock.json';
import staticCred610 from '../data/static-bbs-cred-610.json';

const loadDocumentDefault = defaultDocumentLoader(null);

describe('Static BBS+ Credential Verification (backwards compatibility)', () => {
  test('verifies BBS+ credential from SDK 6.1.0', async () => {
    const result = await verifyCredential(staticCred610, {
      documentLoader: async (doc) => {
        if (doc.startsWith(staticCred610.issuer.id)) {
          return {
            contextUrl: null,
            documentUrl: doc,
            document: didDocument,
          };
        }

        return loadDocumentDefault(doc);
      },
    });
    console.error(JSON.stringify(result, null, 2));
    expect(result.verified).toBe(true);
  });
});
