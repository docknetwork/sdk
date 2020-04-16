// This file will be turned to a folder and will have files like `did/dock.js` and `did/ethr.js`

// Import some utils from Polkadot JS
import { u8aToHex } from '@polkadot/util';
import { randomAsHex, encodeAddress, decodeAddress } from '@polkadot/util-crypto';

import { getSignatureFromKeyringPair } from './misc';
import { isHexWithGivenByteSize } from './codec';

export const DockDIDMethod = 'dock';
export const DockDIDQualifier = `did:${DockDIDMethod}:`;
export const DockDIDByteSize = 32;

/**
 * Error thrown when a DID document lookup was successful, but the did in question does not exist.
 * This is different from a network error.
 */
export class NoDIDError extends Error {
  constructor(did) {
    super(`DID (${did}) does not exist`);
    this.name = 'NoDIDError';
    this.did = did;
  }
}

/**
 * Check if the given identifier is 32 byte hex
 * @param {identifier} identifier - The identifier to check.
 * @return {null} Throws exception if invalid identifier
 */
export function validateDockDIDHexIdentifier(identifier) {
  // Byte size of the Dock DID identifier, i.e. the `DockDIDQualifier` is not counted.
  if (!isHexWithGivenByteSize(identifier, DockDIDByteSize)) {
    throw new Error(`DID identifier must be ${DockDIDByteSize} bytes`);
  }
}

/**
 * Check if the given identifier is 32 byte valid SS58 string
 * @param {identifier} identifier - The identifier to check.
 * @return {null} Throws exception if invalid identifier
 */
export function validateDockDIDSS58Identifier(identifier) {
  // base58-check regex
  const regex = new RegExp(/^[5KL][1-9A-HJ-NP-Za-km-z]{47}$/);
  const matches = regex.exec(identifier);
  if (!matches) {
    throw new Error('The identifier must be 32 bytes and valid SS58 string');
  }
}

/**
 * Gets the hexadecimal value of the given DID.
 * @param {string} did -  The DID can be passed as fully qualified DID like `dock:did:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the DID.
 */
export function getHexIdentifierFromDID(did) {
  if (did.startsWith(DockDIDQualifier)) {
    // Fully qualified DID. Remove the qualifier
    const ss58Did = did.slice(DockDIDQualifier.length);
    try {
      const hex = u8aToHex(decodeAddress(ss58Did));
      // 2 characters for `0x` and 2*byte size of DID
      if (hex.length !== (2 + 2 * DockDIDByteSize)) {
        throw new Error('Unexpected byte size');
      }
      return hex;
    } catch (e) {
      throw new Error(`Invalid SS58 DID ${did}. ${e}`);
    }
  } else {
    try {
      // Check if hex and of correct size and return the hex value if successful.
      validateDockDIDHexIdentifier(did);
      return did;
    } catch (e) {
      // Cannot parse as hex
      throw new Error(`Invalid hexadecimal DID ${did}. ${e}`);
    }
  }
}


/**
 * Create and return a fully qualified Dock DID, i.e. "did:dock:<SS58 string>"
 * @returns {string} - The DID
 */
export function createNewDockDID() {
  const hexId = randomAsHex(DockDIDByteSize);
  const ss58Id = encodeAddress(hexId);
  return `${DockDIDQualifier}${ss58Id}`;
}

/**
 * Returns a `KeyDetail` as expected by the Substrate node
 * @param {PublicKey} publicKey - The public key for the DID. The Keyring is intentionally avoided here as it may not be
 * accessible always, like in case of hardware wallet
 * @param {string} controller - Full DID or hex identifier of the controller of the public key
 * @returns {object} - The object has structure and keys with same names as expected by the Substrate node
 */
export function createKeyDetail(publicKey, controller) {
  return {
    public_key: publicKey.toJSON(),
    controller: getHexIdentifierFromDID(controller),
  };
}

/**
 * Create and return a `KeyUpdate` as expected by the Substrate node. Signing is intentionally kept separate as the
 * JS code may not have access to the signing key like in case of hardware wallet.
 * @param {DIDModule} didModule - The did module
 * @param {string} did - Full DID or hex identifier to update
 * @param {PublicKey} newPublicKey - The new public key for the DID. The
 * @param {string} newController - Full DID or hex identifier of the controller of the public key. Is optional and must
 * only be passed when controller is to be updated.
 * @returns {object} The object has structure and keys with same names as expected by the Substrate node
 */
export async function createKeyUpdate(didModule, did, newPublicKey, newController) {
  const hexId = getHexIdentifierFromDID(did);
  return {
    did: hexId,
    public_key: newPublicKey.toJSON(),
    controller: getHexIdentifierFromDID(newController),
    last_modified_in_block: await didModule.getBlockNoForLastChangeToDID(hexId),
  };
}

/** Sign the given `KeyUpdate` and returns the signature
 * @param {DIDModule} didModule - The did module
 * @param {object} keyUpdate - `KeyUpdate` as expected by the Substrate node
 * @param {KeyringPair} currentKeyPair - Should have the private key corresponding to the current public key for the DID
 * @returns {Signature}
 */
export function signKeyUpdate(didModule, keyUpdate, currentKeyPair) {
  const serializedKeyUpdate = didModule.getSerializedKeyUpdate(keyUpdate);
  return getSignatureFromKeyringPair(currentKeyPair, serializedKeyUpdate);
}

/**
 * Create a `KeyUpdate` as expected by the Substrate node and signs it. Return the `KeyUpdate` object and the signature
 * @param {DIDModule} didModule - The did module
 * @param {string} did - Full DID or hex identifier to update
 * @param {PublicKey} newPublicKey - The new public key for the DID
 * @param {KeyringPair} currentKeyPair - Should have the private key corresponding to the current public key for the DID
 * * @param {string} newController - Full DID or hex identifier of the controller of the public. Is optional and must
 * only be passed when controller is to be updated
 * @returns {array} A 2 element array where the first element is the `KeyUpdate` and the second is the signature
 */
export async function createSignedKeyUpdate(didModule, did, newPublicKey, currentKeyPair, newController) {
  const keyUpdate = await createKeyUpdate(didModule, did, newPublicKey, newController);
  const signature = signKeyUpdate(didModule, keyUpdate, currentKeyPair);
  return [keyUpdate, signature];
}

/**
 * Create and return a `DidRemoval` as expected by the Substrate node. Signing is intentionally kept separate as the
 * JS code may not have access to the signing key like in case of hardware wallet.
 * @param {module} didModule - The did module
 * @param {string} did - Full DID or hex identifier to update
 * @returns {object} The object has structure and keys with same names as expected by the Substrate node
 */
export async function createDidRemoval(didModule, did) {
  const hexId = getHexIdentifierFromDID(did);
  return {
    did: hexId,
    last_modified_in_block: await didModule.getBlockNoForLastChangeToDID(hexId),
  };
}

/**
 * Sign the given `DidRemoval` and returns the signature
 * @param {module} didModule - The did module
 * @param {object} didRemoval - `DidRemoval` as expected by the Substrate node
 * @param {KeyringPair} currentKeyPair - Should have the private key corresponding to the current public key for the DID
 * @returns {Signature}
 */
export function signDidRemoval(didModule, didRemoval, currentKeyPair) {
  const serializedDIDRemoval = didModule.getSerializedDIDRemoval(didRemoval);
  return getSignatureFromKeyringPair(currentKeyPair, serializedDIDRemoval);
}

/**
 * Create a `DidRemoval` as expected by the Substrate node and signs it. Return the `DidRemoval` object and the signature
 * @param {module} didModule - The did module
 * @param {string} did - Full DID or hex identifier to remove
 * @param {KeyringPair} currentKeyPair - Should have the private key corresponding to the current public key for the DID
 * @returns {array} A 2 element array where the first element is the `DidRemoval` and the second is the signature
 */
export async function createSignedDidRemoval(didModule, did, currentKeyPair) {
  const didRemoval = await createDidRemoval(didModule, did);
  const signature = signDidRemoval(didModule, didRemoval, currentKeyPair);
  return [didRemoval, signature];
}
