// This file will be turned to a folder and will have files like `did/dock.js` and `did/ethr.js`

// Import some utils from Polkadot JS
// eslint-disable-next-line max-classes-per-file
import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { isHexWithGivenByteSize, getHexIdentifier } from './codec';
import { PublicKeyEd25519, PublicKeySecp256k1, PublicKey, VerificationRelationship } from '../public-keys';

import { Signature } from "../signatures"; // eslint-disable-line
import {
  getPublicKeyFromKeyringPair,
  getSignatureFromKeyringPair,
  getStateChange,
} from './misc';

export const DockDIDMethod = 'dock';
export const DockDIDQualifier = `did:${DockDIDMethod}:`;
export const DockDIDMethodKeyQualifier = `did:key:${DockDIDMethod}:`;
export const DockDIDByteSize = 32;

export class DidKeypair {
  constructor(keyPair, keyId) {
    this.keyPair = keyPair;
    this.keyId = keyId;
  }

  publicKey() {
    return getPublicKeyFromKeyringPair(this.keyPair);
  }

  sign(message) {
    return getSignatureFromKeyringPair(this.keyPair, message);
  }
}

const SECP256K1_PUBLIC_KEY_PREFIX = 'zQ3';
const ED_25519_PUBLIC_KEY_PREFIX = 'z6Mk';

const DockDidMethodKeySecp256k1Prefix = `${DockDIDQualifier}${SECP256K1_PUBLIC_KEY_PREFIX}`;
const DockDidMethodKeyEd25519Prefix = `${DockDIDMethodKeyQualifier}${ED_25519_PUBLIC_KEY_PREFIX}`;

export class DockDidOrDidMethodKey {
  constructor(api) {
    Object.defineProperty(this, 'api', { value: api });
  }

  get asDid() {
    throw new Error('Not a `Did`');
  }

  get asDidMethodKey() {
    throw new Error('Not a `DidMethodKey`');
  }

  get isDid() {
    return false;
  }

  get isDidMethodKey() {
    return false;
  }

  signStateChange(name, payload, keyRef) {
    const stateChange = getStateChange(this.api, name, payload);
    const keySignature = keyRef.sign(stateChange);

    return createDidSig(this, keyRef, keySignature);
  }

  changeState(method, name, payload, keyRef) {
    const signature = this.signStateChange(
      name,
      payload,
      keyRef,
    );

    return method(payload, signature);
  }
}

export class DockDid extends DockDidOrDidMethodKey {
  constructor(did, api) {
    super(api);
    this.did = did;
  }

  get isDid() {
    return true;
  }

  get asDid() {
    return this.did;
  }

  toJSON() {
    return { Did: this.did };
  }

  toString() {
    return `${DockDIDQualifier}${this.asDid}`;
  }
}

export class DockDidMethodKey extends DockDidOrDidMethodKey {
  constructor(didMethodKey, api) {
    super(api);
    this.didMethodKey = didMethodKey;
  }

  get isDidMethodKey() {
    return true;
  }

  get asDidMethodKey() {
    return this.didMethodKey;
  }

  toJSON() {
    return { DidMethodKey: this.didMethodKey };
  }

  toString() {
    return `${DockDIDMethodKeyQualifier}${this.asDidMethodKey}`;
  }
}

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
 * @param {*} api
 * @param {string} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the DID.
 */
export function typedHexDID(api, did) {
  const hex = getHexIdentifier(
    did,
    [DockDIDQualifier, DockDIDMethodKeyQualifier],
    DockDIDByteSize,
  );

  if (did.startsWith(DockDidMethodKeySecp256k1Prefix)) {
    return new DockDidMethodKey(new PublicKeySecp256k1(hex), api);
  } else if (did.startsWith(DockDidMethodKeyEd25519Prefix)) {
    return new DockDidMethodKey(new PublicKeyEd25519(hex), api);
  } else {
    validateDockDIDHexIdentifier(hex, 32);
    return new DockDid(hex, api);
  }
}

/**
 * Gets the hexadecimal value of the given DID received from the substrate side.
 * @param {string} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the DID.
 */
export function typedHexDIDFromSubstrate(did) {
  const hex = getHexIdentifier(
    u8aToHex(did.isDid ? did.asDid : did.asDidMethodKey),
    [],
    DockDIDByteSize,
  );

  if (did.isDid) {
    return new DockDid(hex);
  } else {
    return new DockDidMethodKey(hex);
  }
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
export function createDidSig(did, { keyId }, rawSig) {
  const sig = rawSig.toJSON();

  if (did instanceof DockDid) {
    return {
      DidSignature: {
        did: did.asDid,
        keyId,
        sig,
      },
    };
  } else if (did instanceof DockDidMethodKey) {
    return {
      DidMethodKeySignature: {
        didKey: did.asDidMethodKey,
        sig,
      },
    };
  } else {
    throw new Error(
      `Incorrect DID passed: \`${did}\`, expected instance of either \`DockDid\` or \`DockDidMethodKey\``,
    );
  }
}
