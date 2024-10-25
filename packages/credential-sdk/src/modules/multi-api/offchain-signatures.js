import { AbstractOffchainSignaturesModule } from "../abstract";
import { NamespaceDid } from "../../types";

export default class MultiApiOffchainSignatures extends AbstractOffchainSignaturesModule {
  /**
   * Add new signature params.
   * @param id - Unique identifier to be used by these params.
   * @param param - The signature params to add.
   * @param targetDid
   * @param didKeypair - The signer DID's keypair
   * @returns {Promise<*>}
   */
  async addParamsTx(id, param, targetDid, didKeypair) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleBy(did).addParamsTx(id, param, did, didKeypair);
  }

  /**
   * Remove existing BBS+ params.
   * @param id - Identifier of the params to be removed
   * @param targetDid -
   * @param didKeypair - Signer DID's keypair
   * @returns {Promise<*>}
   */
  async removeParamsTx(id, targetDid, didKeypair) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleBy(did).removeParamsTx(id, did, didKeypair);
  }

  /**
   * Add a public key
   * @param id - Unique identifier to be used for this key.
   * @param publicKey - public key to add.
   * @param targetDid - The DID to which key is being added
   * @param didKeypair - Signer's didKeypair
   * @returns {Promise<*>}
   */
  async addPublicKeyTx(id, publicKey, targetDid, didKeypair) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleBy(did).addPublicKeyTx(
      id,
      publicKey,
      targetDid,
      didKeypair
    );
  }

  /**
   * Remove public key
   * @param removeKeyId - Identifier of the public key to be removed.
   * @param targetDid - The DID from which key is being removed
   * @param didKeypair - Signer's signing key reference
   * @returns {Promise<*>}
   */
  async removePublicKeyTx(id, targetDid, didKeypair) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleBy(did).removePublicKeyTx(
      id,
      targetDid,
      didKeypair
    );
  }

  /**
   * Retrieves params by DID and counter.
   * @param {*} did
   * @param {*} counter
   * @returns {Promise<Params>}
   */
  async getParams(did, counter) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getParams(id, counter);
  }

  /**
   * Retrieves all params by a DID.
   * @param {*} did
   * @returns {Promise<Map<TypedNumber, Params>>}
   */
  async getAllParamsByDid(did) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getAllParamsByDid(did);
  }

  /**
   * Retrieves all public keys by a DID.
   * @param {*} did
   * @returns {Promise<Map<TypedNumber, PublicKey>>}
   */
  async getAllPublicKeysByDid(did, includeParams) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getAllPublicKeysByDid(id, includeParams);
  }

  /**
   *
   * @param did
   * @param keyId
   * @param withParams - If true, return the params referenced by the public key. It will throw an error if paramsRef is null
   * or params were not found on chain which can happen if they were deleted after this public key was added.
   * @returns {Promise<{bytes: string}|null>}
   */
  async getPublicKey(did, keyId, includeParams = false) {
    const id = NamespaceDid.from(did);

    return await this.moduleById(id).getPublicKey(did, keyId, includeParams);
  }
}
