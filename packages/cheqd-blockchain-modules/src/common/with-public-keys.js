import { TypedUUID, option } from "@docknetwork/credential-sdk/types/generic";

/**
 * Wraps supplied class into a class with logic for public keys and corresponding setup parameters.
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function withPublicKeys(klass) {
  const name = `withPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Add new signature params.
       * @param id - Unique identifier of the params.
       * @param param - The signature params to add.
       * @param didKeypair - The signer DID's keypair.
       * @returns {Promise<*>}
       */
      async addPublicKeyTx(id, param, targetDid, didKeypair) {
        return await this.cheqdOnly.tx.addPublicKey(
          id,
          param,
          targetDid,
          didKeypair
        );
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} id
       * @returns {Promise<PublicKey>}
       */
      async getPublicKey(did, id) {
        return await this.cheqdOnly.getPublicKey(did, id);
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<TypedNumber, PublicKey>>}
       */
      async getAllPublicKeyByDid(did) {
        return await this.cheqdOnly.getAllPublicKeyByDid(did);
      }

      async lastPublicKeyId(targetDid) {
        return option(TypedUUID).from(
          (
            await this.cheqdOnly.latestResourceMetadataBy(
              targetDid,
              this.cheqdOnly.filterPublicKeyMetadata
            )
          )?.id
        );
      }

      async nextPublicKeyId(_) {
        return TypedUUID.random();
      }
    },
  };

  return obj[name];
}
