import { TypedUUID, option } from '@docknetwork/credential-sdk/types/generic';
import { CheqdParamsId } from '@docknetwork/credential-sdk/types';

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
       * @param id - Unique identifier of the params.
       * @param param - The signature params to add.
       * @param didKeypair - The signer DID's keypair.
       * @returns {Promise<*>}
       */
      async addParamsTx(id, param, targetDid, didKeypair) {
        return await this.cheqdOnly.tx.addParams(
          id,
          param,
          targetDid,
          didKeypair,
        );
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} id
       * @returns {Promise<Params>}
       */
      async getParams(did, id) {
        return await this.cheqdOnly.getParams(did, id);
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<TypedNumber, Params>>}
       */
      async getAllParamsByDid(did) {
        return await this.cheqdOnly.getAllParamsByDid(did);
      }

      async lastParamsId(targetDid) {
        return option(TypedUUID).from(
          (
            await this.cheqdOnly.latestResourceMetadataBy(
              targetDid,
              this.cheqdOnly.filterParamsMetadata,
            )
          )?.id,
        );
      }

      async nextParamsId(_) {
        return CheqdParamsId.random();
      }
    },
  };

  return obj[name];
}
