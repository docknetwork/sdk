import { bnToBn } from '@polkadot/util';
import { getPublicKeyFromKeyringPair } from '../../src/utils/misc';
import { MaxGas, MinGasPrice } from '../test-constants';
import { DidKey, VerificationRelationship } from '../../src/public-keys';

/**
 * Registers a new DID on dock chain, keeps the controller same as the DID
 * @param dockAPI
 * @param did
 * @param pair
 * @param verRels
 * @param controllers
 * @returns {Promise<void>}
 */
export async function registerNewDIDUsingPair(dockAPI, did, pair, verRels = undefined, controllers = []) {
  const publicKey = getPublicKeyFromKeyringPair(pair);

  if (verRels === undefined) {
    verRels = new VerificationRelationship();
  }
  // No additional controller
  const didKey = new DidKey(publicKey, verRels);
  return dockAPI.did.new(did, [didKey], controllers, false);
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

export function checkVerificationMethods(did, doc, length, index = undefined, keyNo = undefined) {
  expect(doc.publicKey.length).toEqual(length);
  if (length > 0 && index !== undefined) {
    if (keyNo === undefined) {
      keyNo = index + 1;
    }
    expect(doc.publicKey[index].id).toEqual(`${did}#keys-${keyNo}`);
    expect(doc.publicKey[index].controller).toEqual(did);
    expect(doc.publicKey[index].publicKeyBase58).toBeDefined();
  }
}

export function checkMapsEqual(mapA, mapB) {
  expect(mapA.size).toEqual(mapB.size);
  for (const key of mapA.keys()) {
    expect(mapA.get(key)).toEqual(mapB.get(key));
  }
}

/**
 * Test helper to get the matching doc as per the cred
 * @param cred - credential to match
 * @param issuer
 * @param issuerKeyId
 * @param sigType
 * @returns {{issuanceDate: string, credentialSubject: {alumniOf: string, id: *}, id: *, proof: *, type: [string, string], issuer: string}}
 */
export function getCredMatcherDoc(cred, issuer, issuerKeyId, sigType) {
  return {
    id: cred.id,
    type: cred.type,
    issuanceDate: cred.issuanceDate,
    credentialSubject: cred.credentialSubject,
    issuer,
    proof: expect.objectContaining({
      type: sigType,
      proofValue: expect.anything(),
      proofPurpose: 'assertionMethod',
      verificationMethod: issuerKeyId,
    }),
  };
}

export function getProofMatcherDoc() {
  return {
    results: [
      {
        error: undefined,
        proof: expect.anything(),
        purposeResult: expect.anything(),
        verificationMethod: expect.anything(),
        verified: true,
      },
    ],
    verified: true,
  };
}
