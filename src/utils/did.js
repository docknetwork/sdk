// This file will be turned to a folder and will have files like `did/dock.js` and `did/ethr.js`

// Import some utils from Polkadot JS
// eslint-disable-next-line max-classes-per-file
import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { isHexWithGivenByteSize, getHexIdentifier } from './codec';
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKey, // eslint-disable-line
  VerificationRelationship, // eslint-disable-line
} from '../public-keys';

import { Signature } from "../signatures"; // eslint-disable-line
import {
  getPublicKeyFromKeyringPair,
  getSignatureFromKeyringPair,
  getStateChange,
} from './misc';

export const DockDIDMethod = 'dock';
export const Secp256k1PublicKeyPrefix = 'zQ3s';
export const Ed25519PublicKeyPrefix = 'z6Mk';

export const DockDIDQualifier = `did:${DockDIDMethod}:`;
export const DockDIDMethodKeyQualifier = 'did:key:';
export const DockDIDByteSize = 32;
export const DockDIDMethodKeySecp256k1ByteSize = 33;
export const DockDIDMethodKeyEd25519ByteSize = 32;

export const DockDidMethodKeySecp256k1Prefix = `${DockDIDMethodKeyQualifier}${Secp256k1PublicKeyPrefix}`;
export const DockDidMethodKeyEd25519Prefix = `${DockDIDMethodKeyQualifier}${Ed25519PublicKeyPrefix}`;

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

  /**
   * Create a new keypair from a DockAPI object.
   * @param {DockAPI} dockApi
   * @param seed - Generates 32 byte random seed if not provided
   * @param keypairType - Defaults to ed25519.
   * @param meta
   * @param keyId - Defaults to 1
   * @returns {DidKeypair}
   */
  static fromApi(
    dockApi,
    {
      seed = randomAsHex(32),
      keypairType = 'ed25519',
      meta = null,
      keyId = 1,
    } = {},
  ) {
    return new DidKeypair(
      dockApi.keyring.addFromUri(seed, meta, keypairType),
      keyId,
    );
  }
}

/**
 * Either `did:*` or `did:key:*`.
 */
export class DockDidOrDidMethodKey {
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

  /**
   * Creates signature for the state change with supplied arguments.
   *
   * @param api
   * @param name
   * @param payload
   * @param keyRef
   * @returns {object}
   */
  signStateChange(api, name, payload, keyRef) {
    const stateChange = getStateChange(api, name, payload);
    const keySignature = keyRef.sign(stateChange);

    return createDidSig(this, keyRef, keySignature);
  }

  /**
   * Creates a transaction that will modify the chain state.
   *
   * @param api
   * @param method
   * @param name
   * @param payload
   * @param keyRef
   */
  changeState(api, method, name, payload, keyRef) {
    const signature = this.signStateChange(api, name, payload, keyRef);

    return method(payload, signature);
  }
}

/**
 * `did:*`
 */
export class DockDid extends DockDidOrDidMethodKey {
  constructor(did) {
    super();
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

  toStringSS58() {
    return `${DockDIDQualifier}${encodeAddress(this.asDid)}`;
  }
}

/**
 * `did:key:*`
 */
export class DockDidMethodKey extends DockDidOrDidMethodKey {
  constructor(didMethodKey) {
    super();

    if (didMethodKey instanceof PublicKeyEd25519) {
      this.didMethodKey = { ed25519: didMethodKey.value };
    } else if (didMethodKey instanceof PublicKeySecp256k1) {
      this.didMethodKey = { secp256k1: didMethodKey.value };
    } else {
      throw new Error('Unsupported public key type');
    }
  }

  get isDidMethodKey() {
    return true;
  }

  get asDidMethodKey() {
    return this.didMethodKey;
  }

  toJSON() {
    return {
      DidMethodKey: this.didMethodKey.ed25519
        ? { Ed25519: this.didMethodKey.ed25519 }
        : { Secp256k1: this.didMethodKey.secp256k1 },
    };
  }

  toString() {
    return this.toStringSS58();
  }

  toStringSS58() {
    let prefix;
    let address;
    if (this.didMethodKey.ed25519) {
      prefix = DockDidMethodKeyEd25519Prefix;
      address = this.didMethodKey.ed25519;
    } else if (this.didMethodKey.secp256k1) {
      prefix = DockDidMethodKeySecp256k1Prefix;
      address = this.didMethodKey.secp256k1;
    } else {
      throw new Error('Unsupported public key type');
    }

    return `${prefix}${encodeAddress(address)}`;
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
 * Check if the given identifier is the hex representation of a Dock DID.
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
 * Temporary solution for the DID's backward compatibility.
 *
 * --------------------------------------------------------
 */
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, 'asDid', {
  get() {
    if (this.isDid) {
      return String(this);
    } else {
      throw new Error('Not a `Did`');
    }
  },
});
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, 'isDid', {
  get() {
    return isHexWithGivenByteSize(String(this), DockDIDByteSize);
  },
});
// eslint-disable-next-line no-extend-native
Object.defineProperty(String.prototype, 'toStringSS58', {
  get() {
    return new DockDid(this.asDid).toStringSS58();
  },
});

/**
 * --------------------------------------------------------
 */

/**
 * Takes a DID string, gets the hexadecimal value of that and returns a `DockDidMethodKey` or `DockDid` object.
 * @param api
 * @param {string} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * `did:key:<value>` or a 32 byte hex string
 * @return {string|DockDidOrDidMethodKey} Returns a `string` or `DockDidMethodKey` or `DockDid` object.
 */
export function typedHexDID(api, did) {
  const strDid = did.toString();
  if (api.specVersion < 50) {
    return getHexIdentifier(strDid, DockDIDQualifier, DockDIDByteSize);
  }

  if (strDid.startsWith(DockDidMethodKeySecp256k1Prefix)) {
    const hex = getHexIdentifier(
      strDid,
      DockDidMethodKeySecp256k1Prefix,
      DockDIDMethodKeySecp256k1ByteSize,
    );

    return new DockDidMethodKey(new PublicKeySecp256k1(hex));
  } else if (strDid.startsWith(DockDidMethodKeyEd25519Prefix)) {
    const hex = getHexIdentifier(
      strDid,
      DockDidMethodKeyEd25519Prefix,
      DockDIDMethodKeyEd25519ByteSize,
    );

    return new DockDidMethodKey(new PublicKeyEd25519(hex));
  } else {
    const hex = getHexIdentifier(strDid, DockDIDQualifier, DockDIDByteSize);

    return new DockDid(hex);
  }
}

/**
 * Gets the hexadecimal value of the given DID received from the substrate side.
 * @param api
 * @param {string} did -  The DID can be passed as fully qualified DID like `did:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string|DockDidOrDidMethodKey} Returns an object wrapping the DID.
 */
export function typedHexDIDFromSubstrate(api, did) {
  if (api.specVersion < 50) {
    return getHexIdentifier(did, DockDIDQualifier, DockDIDByteSize);
  } else if (did.isDid) {
    const hex = getHexIdentifier(u8aToHex(did.asDid), [], DockDIDByteSize);

    return new DockDid(hex);
  } else if (did.isDidMethodKey) {
    const key = did.asDidMethodKey;

    if (key.isSecp256k1) {
      const hex = getHexIdentifier(
        u8aToHex(key.asSecp256k1),
        [],
        DockDIDMethodKeySecp256k1ByteSize,
      );

      return new DockDidMethodKey(new PublicKeySecp256k1(hex));
    } else if (key.isEd25519) {
      const hex = getHexIdentifier(
        u8aToHex(key.asEd25519),
        [],
        DockDIDMethodKeyEd25519ByteSize,
      );

      return new DockDidMethodKey(new PublicKeyEd25519(hex));
    } else {
      throw new Error(`Invalid did key: provided: \`${key}\``);
    }
  } else {
    throw new Error(`Invalid did provided: \`${did}\``);
  }
}

/**
 * Return a fully qualified Dock DID id, i.e. "did:dock:<SS58 string>"
 * @param {string|object} hexDid - The hex DID (without the qualifier) or wrapper on DID
 * @returns {string} - The fully qualified DID
 */
export function hexDIDToQualified(hexDid) {
  if (typeof hexDid?.toStringSS58 === 'function') {
    return hexDid.toStringSS58();
  } else {
    const ss58Address = encodeAddress(hexDid);

    return `${DockDIDQualifier}${ss58Address}`;
  }
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
 * @param {string|DockDidOrDidMethodKey} did - DID as string or an object
 * @param {number} keyId -
 * @param rawSig
 * @param {Signature} sig
 * @returns {object}
 */
export function createDidSig(did, { keyId }, rawSig) {
  const sig = rawSig.toJSON();

  if (typeof did === 'string') {
    return {
      did,
      keyId,
      sig,
    };
  } else if (did.isDid) {
    return {
      DidSignature: {
        did: did.asDid,
        keyId,
        sig,
      },
    };
  } else if (did.isDidMethodKey) {
    return {
      DidMethodKeySignature: {
        didMethodKey: did.asDidMethodKey,
        sig,
      },
    };
  } else {
    throw new Error(
      `Incorrect DID passed: \`${did}\`, expected instance of either \`DockDid\` or \`DockDidMethodKey\``,
    );
  }
}
