import { AbstractOffchainSignaturesModule } from "../abstract";
import { NamespaceDid } from "../../types";
import { injectModuleRouter } from "./common";

export default class MultiApiOffchainSignatures extends injectModuleRouter(
  AbstractOffchainSignaturesModule
) {
  /**
   * Add new signature params.
   * @param id - Unique identifier to be used by these params.
   * @param params - The signature params to add.
   * @param targetDid
   * @param didKeypair - The signer DID's keypair
   * @param txParams
   * @returns {Promise<*>}
   */
  async addParams(id, params, targetDid, didKeypair, txParams) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).addParams(
      id,
      params,
      did,
      didKeypair,
      txParams
    );
  }

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

    return await this.moduleById(did).addParamsTx(id, param, did, didKeypair);
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

  async lastParamsId(targetDid) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).lastParamsId(did);
  }

  async nextParamsId(targetDid) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).nextParamsId(did);
  }
}
