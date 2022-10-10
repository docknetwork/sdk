// This file will be turned to a folder and will have files like `did/dock.js` and `did/ethr.js`

// Import some utils from Polkadot JS
// eslint-disable-next-line max-classes-per-file
import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';
import { isHexWithGivenByteSize, getHexIdentifier } from './codec';

import { Signature } from '../signatures'; // eslint-disable-line
import { PublicKey, VerificationRelationship } from '../public-keys'; // eslint-disable-line

export const DockDIDMethod = 'dock';
export const DockDIDQualifier = `did:${DockDIDMethod}:`;
export const DockDIDByteSize = 32;

/**
 * Error thrown when a DID document lookup was successful, but the DID in question does not exist.
 * This is different from a network error.
 */
export class NoDIDError extends Error {
  constructor(did) {
    super(`DID (${did}) does not exist`);
    this.name = 'NoDIDError';
    this.did = did;
    this.message = 'A DID document lookup was successful, but the DID in question does not exist. This is different from a network error.';
  }
}

/**
 * Error thrown when a DID exists on chain but is an off-chain DID, meaning the DID document exists off-chain.
 */
export class NoOnchainDIDError extends Error {
  constructor(did) {
    super(`DID (${did}) is an off-chain DID`);
    this.name = 'NoOnchainDIDError';
    this.did = did;
    this.message = 'The DID exists on chain but is an off-chain DID, meaning the DID document exists off-chain.';
  }
}

/**
 * Error thrown when a DID exists on chain and is an on-chain DID but the lookup was performed for an off-chain DID.
 */
export class NoOffchainDIDError extends Error {
  constructor(did) {
    super(`DID (${did}) is an on-chain DID`);
    this.name = 'NoOffchainDIDError';
    this.did = did;
    this.message = 'The DID exists on chain and is an on-chain DID but the lookup was performed for an off-chain DID.';
  }
}

/**
 * Check if the given identifier is 32 byte hex
 * @param {string} identifier - The identifier to check.
 * @return {void} Throws exception if invalid identifier
 */
export function validateDockDIDHexIdentifier(identifier) {
  // Byte size of the Dock DID identifier, i.e. the `DockDIDQualifier` is not counted.
  if (!isHexWithGivenByteSize(identifier, DockDIDByteSize)) {
    throw new Error(`DID identifier must be ${DockDIDByteSize} bytes`);
  }
}

/**
 * Check if the given identifier is 32 byte valid SS58 string
 * @param {string} identifier - The identifier to check.
 * @return {void} Throws exception if invalid identifier
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
 * @param {string} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the DID.
 */
export function getHexIdentifierFromDID(did) {
  return getHexIdentifier(did, DockDIDQualifier, validateDockDIDHexIdentifier, DockDIDByteSize);
}

/**
 * Return a fully qualified Dock DID id, i.e. "did:dock:<SS58 string>"
 * @param {string} hexId - The hex blob id (without the qualifier)
 * @returns {string} - The fully qualified Blob id
 */
export function hexDIDToQualified(hexId) {
  const ss58Id = encodeAddress(hexId);
  return `${DockDIDQualifier}${ss58Id}`;
}

/**
 * Create and return a fully qualified Dock DID, i.e. "did:dock:<SS58 string>"
 * @returns {string} - The DID
 */
export function createNewDockDID() {
  const hexId = randomAsHex(DockDIDByteSize);
  return hexDIDToQualified(hexId);
}

/**
 * Returns a `DidKey` as expected by the Substrate node
 * @param {PublicKey} publicKey - The public key for the DID. The Keyring is intentionally avoided here as it may not be
 * accessible always, like in case of hardware wallet
 * @param {VerificationRelationship} verRel
 * @returns {object} - The object has structure and keys with same names as expected by the Substrate node
 */
export function createDidKey(publicKey, verRel) {
  return {
    publicKey: publicKey.toJSON(),
    verRels: verRel.value,
  };
}

/**
 *
 * @param {string} did - DID as hex
 * @param {number} keyId -
 * @param {Signature} sig
 * @returns {{sig: *, keyId, did}}
 */
export function createDidSig(did, keyId = 1, sig) {
  return {
    did, keyId, sig: sig.toJSON(),
  };
}
