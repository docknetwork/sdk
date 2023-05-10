// Mock axios
import mockAxios from '../mocks/axios';

import {
  verifyCredential,
} from '../../src/utils/vc/index';

mockAxios();

const controllerUrl = 'https://gist.githubusercontent.com/lovesh/312d407e3a16be0e7d5e43169e824958/raw';
const keyUrl = 'https://gist.githubusercontent.com/lovesh/67bdfd354cfaf4fb853df4d6713f4610/raw';

function getSamplePresignedCredential() {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
    ],
    id: 'https://example.com/credentials/1872',
    type: ['VerifiableCredential', 'AlumniCredential'],
    issuanceDate: '2020-04-15T09:05:35Z',
    credentialSubject: {
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
      alumniOf: 'Example University',
    },
    issuer: controllerUrl,
    proof: {
      type: 'EcdsaSecp256k1Signature2019',
      created: '2021-11-24T21:47:28Z',
      proofValue: 'zAN1rKvtBajWcQS61LU4wX8hB4tUNFze44pHKwkVYoZaGMRxXquAaKcnUiwarZyWmMQzB4ttFLCEFXQq6F9dnq5pWJSC1WZgga',
      proofPurpose: 'assertionMethod',
      verificationMethod: keyUrl,
    },
  };
}

describe('Static pre-signed credential validation', () => {
  test('Presigned credential should verify', async () => {
    const results = await verifyCredential(getSamplePresignedCredential());
    expect(results.verified).toBe(true);
  });
});
