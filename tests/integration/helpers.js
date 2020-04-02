import {createKeyDetail} from '../../src/utils/did';
import {getPublicKeyFromKeyringPair} from '../../src/utils/misc';

/**
 * Registers a new DID on dock chain, keeps the controller same as the DID
 * @param dockAPI
 * @param did
 * @param pair
 * @returns {Promise<void>}
 */
async function registerNewDID(dockAPI, did, pair) {
  const publicKey = getPublicKeyFromKeyringPair(pair);

  // The controller is same as the DID
  const keyDetail = createKeyDetail(publicKey, did);
  const transaction = dockAPI.did.new(did, keyDetail);
  return await dockAPI.sendTransaction(transaction);
}

export {
  registerNewDID
};
