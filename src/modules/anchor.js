/* eslint-disable camelcase */
import { construct, verify_proof } from 'mrklt';
import BLAKE2b from 'blake2b';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { isHexWithGivenByteSize, normalizeToHex } from '../utils/codec';
import NoAnchorError from '../utils/errors/no-anchor-error';

/** Class to create and query anchors from chain. */
export default class AnchorModule {
  /**
   * sets the dock api for this module
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param {Function} signAndSend - Callback signing and sending
   */
  setApi(api, signAndSend) {
    this.api = api;
    this.module = api.tx.anchor;
    this.signAndSend = signAndSend;
  }

  /**
   * Prepare transaction to write anchor on chain
   * @param {Uint8Array|string} anchor
   * @return {object} The extrinsic to sign and send.
   */
  deployTx(anchor) {
    const toPost = normalizeToHex(anchor);
    return this.module.deploy(toPost);
  }

  /**
   * Write anchor on chain
   * @param anchor
   * @param waitForFinalization
   * @param params
   * @returns {Promise<*>}
   */
  async deploy(anchor, waitForFinalization = true, params = {}) {
    return this.signAndSend(this.deployTx(anchor), waitForFinalization, params);
  }

  /**
   * Query anchor from chain
   * @param anchor
   * @param {Boolean} preHashed - If the anchor has already been hashed.
   * @returns {Promise<*>} - The promise will either successfully resolve to the block number where anchor was created
   * or reject with an error.
   */
  async get(anchor, preHashed = false) {
    let key;
    if (preHashed) {
      key = normalizeToHex(anchor);
    } else if (anchor instanceof Uint8Array) {
      key = u8aToHex(this.hash(anchor));
    } else if (isHexWithGivenByteSize(anchor)) {
      key = u8aToHex(this.hash(hexToU8a(anchor)));
    } else {
      throw new Error('Require a hex string or a byte array');
    }

    const resp = await this.api.query.anchor.anchors(key);
    if (resp.isNone) {
      throw new NoAnchorError(anchor);
    }
    return resp.unwrap().toNumber();
  }

  /**
   * Batch multiple documents in binary merkle tree and return the root and proofs for each document
   * @param documents
   * @returns {Array} - An 2 element array where 1st element is root and 2nd is an array with proofs for
   * each document.
   */
  batchDocumentsInMerkleTree(documents) {
    // Hash all documents
    const leafHashes = documents.map(this.hash);

    // If only one document was hashed, just return that as the root with no proofs (single anchor)
    if (leafHashes.length === 1) {
      return [leafHashes[0], []];
    }

    // Concatenate all leaf hashes into one bytearray
    const packed = new Uint8Array(leafHashes.map((a) => [...a]).flat());
    const [root, proofs] = construct(packed);
    return [Uint8Array.from(root), proofs, leafHashes];
  }

  /**
   * Verify inclusion proof of document in a merkle tree with given root. The document is hashed to form a leaf first
   * @param document
   * @param proof
   * @param root
   * @returns {boolean}
   */
  verifyMerkleProofOfDocument(document, proof, root) {
    const hash = this.hash(document);
    return this.verifyMerkleProofOfLeaf(hash, proof, root);
  }

  /**
   * Verify inclusion proof of leaf in a merkle tree with given root.
   * @param leaf
   * @param proof
   * @param root
   * @returns {boolean}
   */
  verifyMerkleProofOfLeaf(leaf, proof, root) {
    /* eslint-disable camelcase */
    const calculatedRoot = verify_proof(leaf, proof);
    return calculatedRoot.length === root.length && calculatedRoot.every((v, i) => v === root[i]);
  }

  /**
   * Hash given data using Blake2b
   * @param anchor
   * @returns {Uint8Array}
   */
  hash(anchor) {
    const h = BLAKE2b(32);
    h.update(anchor);
    return h.digest();
  }
}
