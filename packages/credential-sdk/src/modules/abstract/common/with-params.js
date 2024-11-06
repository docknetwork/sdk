import {
  withExtendedPrototypeProperties,
  withExtendedStaticProperties,
} from "../../../utils";

export default function withParams(klass) {
  const name = `withParams(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Create object to add new parameters on chain
       * @param prepareAddPublicKey
       * @param curveType
       * @param label
       * @returns {{}}
       */
      static prepareAddParameters(...args) {
        const { Params } = this;

        return new Params(...args);
      }

      /**
       * Add new params assiociated with the supplied DID.
       * @param id - Unique identifier of the new params to be added.
       * @param params - The params assiociated with the supplied DID to add.
       * @param targetDid - Params owner.
       * @param didKeypair - Signer's keypair
       * @param txParams - Special parameters for the transaction.
       * @returns {Promise<*>}
       */
      async addParams(id, params, targetDid, didKeypair, txParams) {
        return await this.signAndSend(
          await this.addParamsTx(id, params, targetDid, didKeypair),
          txParams
        );
      }

      /**
       * Retrieves params by a DID and unique identifier.
       * @param {*} did
       * @param {*} id
       * @returns {Promise<Params>}
       */
      async getParams(_did, _id) {
        throw new Error("Unimplemented");
      }

      /**
       * Retrieves all params by a DID
       * @param {*} did
       * @returns {Promise<Map<Id, Params>>}
       */
      async getAllParamsByDid(_did) {
        throw new Error("Unimplemented");
      }

      /**
       * Retrieves latest params identifier used by the supplied DID.
       * @param {*} did
       * @returns {Promise<Id>}
       */
      async lastParamsId(_targetDid) {
        throw new Error("Unimplemented");
      }

      /**
       * Retrieves next params identifier that can be used by the supplied DID.
       * @param {*} did
       * @returns {Promise<Id>}
       */
      async nextParamsId(_targetDid) {
        throw new Error("Unimplemented");
      }
    },
  };

  /**
   * Abstract logic allowing to operate with public keys and parameters.
   */
  return withExtendedPrototypeProperties(
    [
      "addParamsTx",
      "getParams",
      "getAllParamsByDid",
      "lastParamsId",
      "nextParamsId",
    ],
    withExtendedStaticProperties(["Params"], obj[name])
  );
}
