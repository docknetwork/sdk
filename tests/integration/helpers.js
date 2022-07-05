import { bnToBn } from '@polkadot/util';
import { createDidKey } from '../../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { MaxGas, MinGasPrice } from '../test-constants';
import { DidKey, VerificationRelationship } from '../../src/public-keys';
import { BTreeSet } from '@polkadot/types';

/**
 * Registers a new DID on dock chain, keeps the controller same as the DID
 * @param dockAPI
 * @param did
 * @param pair
 * @param verRels
 * @returns {Promise<void>}
 */
export async function registerNewDIDUsingPair(dockAPI, did, pair, verRels = undefined) {
  const publicKey = getPublicKeyFromKeyringPair(pair);

  if (verRels === undefined) {
    verRels = new VerificationRelationship();
  }
  // No additional controller
  const didKey = new DidKey(publicKey, verRels);
  return dockAPI.did.new(did, [didKey], [], false);
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

export function defaultEVMAccountEndowment() {
  return bnToBn(MinGasPrice).mul(bnToBn(MaxGas)).muln(2);
}
