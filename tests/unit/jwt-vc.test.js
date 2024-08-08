// Mock fetch
import mockFetch from '../mocks/fetch';

import {
  verifyCredential,
  verifyPresentation,
} from '../../src/utils/vc/index';
import DIDJWKResolver from '../../src/resolver/did/did-jwk-resolver';

mockFetch();

const SPHEREON_ID_JWT_CREDENTIAL = 'eyJraWQiOiJkaWQ6andrOmV5SmhiR2NpT2lKRlV6STFOaUlzSW5WelpTSTZJbk5wWnlJc0ltdDBlU0k2SWtWRElpd2lZM0oySWpvaVVDMHlOVFlpTENKNElqb2lSRlZqTUVwMVNuRjFNbFV5U1dGNVN6TXlOMFJzVjE5b05VcHJPRzlqUmxSbVVsQktRVGxNTUVwQlVTSXNJbmtpT2lJd01qSlBWMk5IYmtvNFJFUmZkbmhGTFY5UldUSmhURUZQZUZSdVlUVjFabmRpWWpkMVNFRnhSM0YzSW4wIzAiLCJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHBzOi8vc3BoZXJlb24tb3BlbnNvdXJjZS5naXRodWIuaW8vc3NpLW1vYmlsZS13YWxsZXQvY29udGV4dC9zcGhlcmVvbi13YWxsZXQtaWRlbnRpdHktdjEuanNvbmxkIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJTcGhlcmVvbldhbGxldElkZW50aXR5Q3JlZGVudGlhbCJdLCJjcmVkZW50aWFsU3ViamVjdCI6eyJmaXJzdE5hbWUiOiJUZXN0IiwibGFzdE5hbWUiOiJUZXN0IiwiZW1haWxBZGRyZXNzIjoidGVzdEB0ZXN0LmNvbSJ9fSwic3ViIjoiZGlkOmp3azpleUpoYkdjaU9pSkZVekkxTmlJc0luVnpaU0k2SW5OcFp5SXNJbXQwZVNJNklrVkRJaXdpWTNKMklqb2lVQzB5TlRZaUxDSjRJam9pUkZWak1FcDFTbkYxTWxVeVNXRjVTek15TjBSc1YxOW9OVXByT0c5alJsUm1VbEJLUVRsTU1FcEJVU0lzSW5raU9pSXdNakpQVjJOSGJrbzRSRVJmZG5oRkxWOVJXVEpoVEVGUGVGUnVZVFYxWm5kaVlqZDFTRUZ4UjNGM0luMCIsImp0aSI6InVybjp1dWlkOmNiOWUzYzZhLTZjOTYtNGFiYS1iNWY0LWFiM2RmMDM4Y2MyMiIsIm5iZiI6MTcyMjk3NDM5OSwiaXNzIjoiZGlkOmp3azpleUpoYkdjaU9pSkZVekkxTmlJc0luVnpaU0k2SW5OcFp5SXNJbXQwZVNJNklrVkRJaXdpWTNKMklqb2lVQzB5TlRZaUxDSjRJam9pUkZWak1FcDFTbkYxTWxVeVNXRjVTek15TjBSc1YxOW9OVXByT0c5alJsUm1VbEJLUVRsTU1FcEJVU0lzSW5raU9pSXdNakpQVjJOSGJrbzRSRVJmZG5oRkxWOVJXVEpoVEVGUGVGUnVZVFYxWm5kaVlqZDFTRUZ4UjNGM0luMCJ9.Y9CBYHA_sgfA_V40i69SYrqsAK1OZ6rUW8NlrZwavbPxcVS_LX3tFvRRU0jkslUbuf7rColxf2f8zo-YMan-_w';

// Test constants
const vpId = 'https://example.com/credentials/12345';
const vpHolder = 'https://example.com/credentials/1234567890';

function getSamplePres(presentationCredentials) {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    verifiableCredential: presentationCredentials,
    id: vpId,
    holder: vpHolder,
  };
}

describe('Static JWT-VC verification', () => {
  const resolver = new DIDJWKResolver();

  test('Sphereon ID credential', async () => {
    const result = await verifyCredential(SPHEREON_ID_JWT_CREDENTIAL, {
      resolver,
    });
    expect(result.verified).toBe(true);
  });

  test('Sphereon ID credential in presentation', async () => {
    const result = await verifyPresentation(getSamplePres([SPHEREON_ID_JWT_CREDENTIAL]), {
      resolver,
      unsignedPresentation: true,
    });
    expect(result.verified).toBe(true);
  });
});
