// This file will be turned to a folder and will have files like `did/dock.js` and `did/ethr.js`

// Import some utils from Polkadot JS
import {u8aToHex} from '@polkadot/util';
import {randomAsHex, encodeAddress, decodeAddress} from '@polkadot/util-crypto';

import {isHexWithGivenByteSize} from '../utils';
import dock, {PublicKeyEd25519, PublicKeySr25519, SignatureEd25519, SignatureSr25519} from '../dock-sdk';

const DockDIDQualifier = 'did:dock:';
const DockDIDByteSize = 32;

/**
 * Check if the given identifier is 32 byte hex
 * @param {identifier} identifier - The identifier to check.
 * @return {null} Throws exception if invalid identifier
 */
function validateDockDIDIdentifier(identifier) {
  // Byte size of the Dock DID identifier, i.e. the `DockDIDQualifier` is not counted.
  if (!isHexWithGivenByteSize(identifier, DockDIDByteSize)) {
    throw new Error(`DID identifier must be ${DockDIDByteSize} bytes`);
  }
}

/**
 * Gets the hexadecimal value of the given DID.
 * @param {string} did -  The DID can be passed as fully qualified DID like `dock:did:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the DID.
 */
function getHexIdentifierFromDID(did) {
  if (did.startsWith(DockDIDQualifier)) {
    // Fully qualified DID. Remove the qualifier
    let ss58Did = did.slice(DockDIDQualifier.length);
    try {
      const hex = u8aToHex(decodeAddress(ss58Did));
      // 2 characters for `0x` and 2*byte size of DID
      if (hex.length !== (2 + 2*DockDIDByteSize)) {
        throw new Error('Unexpected byte size');
      }
      return hex;
    } catch (e) {
      throw new Error(`Invalid SS58 DID ${did}. ${e}`);
    }
  } else {
    try {
      // Check if hex and of correct size and return the hex value if successful.
      validateDockDIDIdentifier(did);
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
function createNewDockDID() {
  const hexId = randomAsHex(DockDIDByteSize);
  const ss58Id = encodeAddress(hexId);
  return `${DockDIDQualifier}${ss58Id}`;
}


async function createNewKeyUpdate(didModule, did, currentKeyPair, newKeyPair, newController) {
  if (newKeyPair.type !== 'ed25519' && newKeyPair.type !== 'sr25519') {
    throw new Error('Only ed25519 and sr25519 keys supported as of now');
  }
  if (currentKeyPair.type !== 'ed25519' && currentKeyPair.type !== 'sr25519') {
    throw new Error('Only ed25519 and sr25519 keys supported as of now');
  }

  const hexId = getHexIdentifierFromDID(did);
  // Get DID details. This call will fail if DID does not exist on chain already
  const last_modified_in_block = (await didModule.getDetail(hexId))[1];

  const newPk = newKeyPair.type === 'ed25519' ? PublicKeyEd25519.fromKeyringPair(newKeyPair) : PublicKeySr25519.fromKeyringPair(newKeyPair);
  const serializedKeyUpdate = didModule.getSerializedKeyUpdate(hexId, newPk, last_modified_in_block, newController);
  const signature = currentKeyPair.type === 'ed25519' ? new SignatureEd25519(serializedKeyUpdate, currentKeyPair) : new SignatureSr25519(serializedKeyUpdate, currentKeyPair)
  // TODO: Return KeyUpdate
}


async function createNewDidRemove(didModule, did, currentKeyPair) {
  if (currentKeyPair.type !== 'ed25519' && currentKeyPair.type !== 'sr25519') {
    throw new Error('Only ed25519 and sr25519 keys supported as of now');
  }

  const hexId = getHexIdentifierFromDID(did);
  // Get DID details. This call will fail if DID does not exist on chain already
  const last_modified_in_block = (await didModule.getDetail(hexId))[1];

  const serializedKeyUpdate = didModule.getSerializedDIDRemoval(hexId, last_modified_in_block,);
  const signature = currentKeyPair.type === 'ed25519' ? new SignatureEd25519(serializedKeyUpdate, currentKeyPair) : new SignatureSr25519(serializedKeyUpdate, currentKeyPair)
  // TODO: Return DidRemove
}

export {
  validateDockDIDIdentifier,
  getHexIdentifierFromDID,
  DockDIDQualifier,
  createNewDockDID,
  createNewKeyUpdate,
  createNewDidRemove
};
