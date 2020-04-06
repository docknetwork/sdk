import {createKeyDetail} from '../../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../../src/utils/misc';

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
  const transaction = dockAPI.did.new(did, keyDetail);
  return await dockAPI.sendTransaction(transaction);
}

/**
 * Test helper to get the key doc in a format needed for vc.js
 * @param did
 * @param keypair
 * @param typ
 * @returns {{publicKeyBase58: *, controller: *, id: string, type: *, privateKeyBase58: (string|KeyObject|T2|Buffer|CryptoKey)}}
 */
export function getKeyDoc(did, keypair, typ) {
  if (typ === 'Sr25519VerificationKey2020') {
    // Keydoc for Sr25519 does not have private key in clear
    return {
      id: `${did}#keys-1`,
      controller: did,
      type: typ,
      keypair: keypair,
      publicKey: getPublicKeyFromKeyringPair(keypair)
    };
  } else {
    return {
      id: `${did}#keys-1`,
      controller: did,
      type: typ,
      privateKeyBase58: keypair.privateKey,
      publicKeyBase58: keypair.publicKey
    };
  }
}
