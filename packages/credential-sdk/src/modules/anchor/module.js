/* eslint-disable camelcase */
import { construct, verify_proof } from 'mrklt';
import { AbstractBaseModule } from '../common';
import { Anchor } from '../../types/anchor';
import { withExtendedPrototypeProperties } from '../../utils';

/** Class to create and query anchors from chain. */
class AbstractAnchorModule extends AbstractBaseModule {
  /**
   * Write anchor on chain
   * @param anchor
   * @returns {Promise<*>}
   */
  async deploy(anchor, params) {
    return await this.signAndSend(await this.deployTx(anchor), params);
  }

  /**
   * Query anchor from chain
   * @param {AnchorHash} anchor
   * @param {boolean} preHashed - If the anchor has already been hashed.
   * @returns {Promise<Anchor>} - The promise will either successfully resolve to the block number where anchor was created
   * or reject with an error.
   */
  async get(_anchorKey, _preHashed = false) {
    throw new Error('Unimplemented');
  }

  /**
   * Batch multiple documents in binary merkle tree and return the root and proofs for each document
   * @param documents
   * @returns {Array} - An 2 element array where 1st element is root and 2nd is an array with proofs for
   * each document.
   */
  static batchDocumentsInMerkleTree(documents) {
    // Hash all documents
    const leafHashes = documents.map((doc) => Anchor.hash(doc).bytes);

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
  static verifyMerkleProofOfDocument(document, proof, root) {
    const hash = Anchor.hash(document).bytes;
    return this.verifyMerkleProofOfLeaf(hash, proof, root);
  }

  /**
   * Verify inclusion proof of leaf in a merkle tree with given root.
   * @param leaf
   * @param proof
   * @param root
   * @returns {boolean}
   */
  static verifyMerkleProofOfLeaf(leaf, proof, root) {
    /* eslint-disable camelcase */
    const calculatedRoot = verify_proof(leaf, proof);
    return (
      calculatedRoot.length === root.length
      && calculatedRoot.every((v, i) => v === root[i])
    );
  }
}

export default withExtendedPrototypeProperties(
  ['deployTx', 'get'],
  AbstractAnchorModule,
);
