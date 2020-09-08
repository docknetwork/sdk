import { createKeyDetail } from '../../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';

/**
 * Registers a new DID on dock chain, keeps the controller same as the DID
 * @param dockAPI
 * @param did
 * @param pair
 * @returns {Promise<void>}
 */
export async function registerNewDIDUsingPair(dockAPI, did, pair) {
  const publicKey = getPublicKeyFromKeyringPair(pair);

  // The controller is same as the DID
  const keyDetail = createKeyDetail(publicKey, did);
  return dockAPI.did.new(did, keyDetail, false);
}

/**
 * Test helper to get an unsigned cred with given credential id and holder DID
 * @param credId - Credential id
 * @param holderDID - Holder DID
 * @returns {{issuanceDate: string, credentialSubject: {alumniOf: string, id: *}, id: *, type: [string, string], '@context': [string, string]}}
 */
export function getUnsignedCred(credId, holderDID) {
  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1',
    ],
    id: credId,
    type: ['VerifiableCredential', 'AlumniCredential'],
    issuanceDate: '2020-03-18T19:23:24Z',
    credentialSubject: {
      id: holderDID,
      alumniOf: 'Example University',
    },
  };
}
