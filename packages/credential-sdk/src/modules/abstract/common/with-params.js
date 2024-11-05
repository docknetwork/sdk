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
       * @param targetDid
       * @param keyPair - Signer's keypair
       * @param params
       * @returns {Promise<*>}
       */
      async addParams(id, params, targetDid, didKeypair, txParams) {
        return await this.signAndSend(
          await this.addParamsTx(id, params, targetDid, didKeypair),
          txParams
        );
      }

      /**
       * Remove existing BBS+ params.
       * @param id - Identifier of the parameters to be removed.
       * @param targetDid - Target DID associated with the params
       * @param keyPair - Signer's keypair

       * @returns {Promise<*>}
       */
      async removeParams(id, targetDid, didKeypair, params) {
        return await this.signAndSend(
          await this.removeParamsTx(id, targetDid, didKeypair),
          params
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
      "removeParamsTx",
      "getParams",
      "getAllParamsByDid",
      "lastParamsId",
      "nextParamsId",
    ],
    withExtendedStaticProperties(["Params"], obj[name])
  );
}
