/* eslint-disable max-classes-per-file */

import { isHexWithGivenByteSize } from '../../../utils/bytes';
import {
  PublicKey, // eslint-disable-line
} from '../../public-keys';

import { Signature } from "../../signatures"; // eslint-disable-line

import { DockDIDByteSize } from './constants';

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

  if (did.isDid) {
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
      `Incorrect DID passed: \`${did}\`, expected instance of either \`DockDid\` or \`DidMethodKey\``,
    );
  }
}
