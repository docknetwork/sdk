import { encodeAddress, randomAsHex } from '@polkadot/util-crypto';
import {
  u8aToString, stringToHex, bufferToU8a, u8aToHex,
} from '@polkadot/util';

import { getNonce, getSignatureFromKeyringPair, getStateChange } from '../utils/misc';
import { isHexWithGivenByteSize, getHexIdentifier } from '../utils/codec';
import NoBlobError from '../utils/errors/no-blob-error';
import { createDidSig, getHexIdentifierFromDID } from '../utils/did';

export const DockBlobQualifier = 'blob:dock:';
export const DockBlobIdByteSize = 32;

// Maximum size of the blob in bytes
// implementer may choose to implement this as a dynamic config option settable with the `parameter_type!` macro
export const BLOB_MAX_BYTE_SIZE = 8192;

/**
 * Check if the given identifier is 32 byte hex
 * @param {string} identifier - The identifier to check.
 * @return {void} Throws exception if invalid identifier
 */
export function validateBlobIDHexIdentifier(identifier) {
  if (!isHexWithGivenByteSize(identifier, DockBlobIdByteSize)) {
    throw new Error(`ID must be ${DockBlobIdByteSize} bytes`);
  }
}

/**
 * Gets the hexadecimal value of the given ID.
 * @param {string} id -  The ID can be passed as fully qualified ID like `blob:dock:<SS58 string>` or
 * a 32 byte hex string
 * @return {string} Returns the hexadecimal representation of the ID.
 */
export function getHexIdentifierFromBlobID(id) {
  return getHexIdentifier(id, DockBlobQualifier, validateBlobIDHexIdentifier, DockBlobIdByteSize);
}

/**
 * Create and return a fully qualified Dock Blob id, i.e. "blob:dock:<SS58 string>"
 * @returns {string} - The Blob id
 */
export function createNewDockBlobId() {
  const hexId = randomAsHex(DockBlobIdByteSize);
  return blobHexIdToQualified(hexId);
}

/**
 * Return a fully qualified Dock Blob id, i.e. "blob:dock:<SS58 string>"
 * @param {string} hexId - The hex blob id (without the qualifier)
 * @returns {string} - The fully qualified Blob id
 */
export function blobHexIdToQualified(hexId) {
  const ss58Id = encodeAddress(hexId);
  return `${DockBlobQualifier}${ss58Id}`;
}

/** Class to create and update Blobs on chain. */
class BlobModule {
  /**
   * Creates a new instance of BlobModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param signAndSend
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.module = api.tx.blobStore;
    this.signAndSend = signAndSend;
  }

  /**
   * Create a signed transaction for adding a new blob
   * @param blob
   * @param signerDid - Signer of the blob
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise<*>}
   */
  async createNewTx(blob, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    const hexDid = getHexIdentifierFromDID(signerDid);
    const [addBlob, didSig] = await this.createSignedAddBlob(blob, hexDid, keyPair, keyId, { nonce, didModule });
    return this.module.new(addBlob, didSig);
  }

  /**
   * Write a new blob on chain.
   * @param blob
   * @param signerDid - Signer of the blob
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async new(blob, signerDid, keyPair, keyId, { nonce = undefined, didModule = undefined }, waitForFinalization = true, params = {}) {
    return this.signAndSend(
      (await this.createNewTx(blob, signerDid, keyPair, keyId, { nonce, didModule })), waitForFinalization, params,
    );
  }

  /**
   * Get blob with given id from the chain. Throws if the blob can't be found.
   * @param {string} id - Can either be a full blob id like blob:dock:0x... or just the hex identifier
   * @returns {Promise<Array>} - A 2-element array where the first is the author and the second is the blob contents.
   */
  async get(id) {
    const hexId = getHexIdentifierFromBlobID(id);
    const resp = await this.api.query.blobStore.blobs(hexId);
    if (resp.isNone) {
      throw new NoBlobError(id);
    }

    const respTuple = resp.unwrap();
    if (respTuple.length === 2) {
      let value = bufferToU8a(respTuple[1]);

      // Try to convert the value to a JSON object
      try {
        const strValue = u8aToString(value);
        if (strValue.substring(0, 1) === '{') {
          value = JSON.parse(strValue);
        }
      } catch (e) {
        // no-op, just use default Uint8 array value
      }

      return [u8aToHex(respTuple[0]), value];
    }
    throw new Error(`Needed 2 items in response but got${respTuple.length}`);
  }

  /**
   * Create an `AddBlob` struct as expected by node and return along with signature.
   * @param blob
   * @param hexDid - Signer DID in hex form
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @returns {Promise}
   */
  async createSignedAddBlob(blob, hexDid, keyPair, keyId, { nonce = undefined, didModule = undefined }) {
    if (!blob.blob) {
      throw new Error('Blob must have a value!');
    }
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(hexDid, nonce, didModule);

    const blobObj = {
      ...blob,
      blob: this.getSerializedBlobValue(blob.blob),
    };
    const addBlob = {
      blob: blobObj,
      nonce,
    };
    const serializedAddBlob = this.getSerializedBlob(addBlob);
    const signature = getSignatureFromKeyringPair(keyPair, serializedAddBlob);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [addBlob, didSig];
  }

  getSerializedBlobValue(blobValue) {
    if (blobValue instanceof Uint8Array) {
      return [...blobValue];
    } else if (typeof blobValue === 'object') {
      return stringToHex(JSON.stringify(blobValue));
    } else if (typeof blobValue === 'string' && !isHexWithGivenByteSize(blobValue)) {
      return stringToHex(blobValue);
    }
    // Assuming `blobValue` is in hex
    return blobValue;
  }

  /**
   * Serializes the `Blob` (for signing before sending to the node)
   * @param {object} blob - `Blob` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedBlob(blob) {
    return getStateChange(this.api, 'AddBlob', blob);
  }
}

export default BlobModule;
