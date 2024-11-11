/**
 * Wraps supplied class into a class with logic for public keys and corresponding setup parameters.
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function withParams(klass) {
  const name = `withParams(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Add new signature params.
       * @param param - The signature params to add.
       * @param didKeypair - The signer DID's keypair

       * @returns {Promise<*>}
       */
      async addParamsTx(id, param, targetDid, didKeypair) {
        return await this.dockOnly.tx.addParams(param, targetDid, didKeypair);
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} id
       * @returns {Promise<Params>}
       */
      async getParams(did, id) {
        return await this.dockOnly.getParams(did, id);
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<TypedNumber, Params>>}
       */
      async getAllParamsByDid(did) {
        return await this.dockOnly.getAllParamsByDid(did);
      }

      async lastParamsId(targetDid) {
        return await this.dockOnly.paramsCounter(targetDid);
      }

      async nextParamsId(targetDid) {
        return (await this.lastParamsId(targetDid)).inc();
      }
    },
  };

  return obj[name];
}
