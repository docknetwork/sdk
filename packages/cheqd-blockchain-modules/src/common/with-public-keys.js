import { TypedUUID, option } from '@docknetwork/credential-sdk/types/generic';

/**
 * Wraps supplied class into a class with logic for public keys and corresponding setup parameters.
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function withPublicKeys(klass) {
  const name = `withPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Add new signature public key.
       * @param id - Unique identifier of the public key.
       * @param param - The signature public key to add.
       * @param targetDid - Target DID to attach key to.
       * @param didKeypair - The signer DID's keypair.
       * @returns {Promise<*>}
       */
      async addPublicKeyTx(id, param, targetDid, didKeypair) {
        return await this.cheqdOnly.tx.addPublicKey(
          id,
          param,
          targetDid,
          didKeypair,
        );
      }

      /**
       * Retrieves public key by DID and identifier.
       * @param {*} did
       * @param {*} id
       * @param {boolean} [includeParams=false]
       * @returns {Promise<PublicKey>}
       */
      async getPublicKey(did, id, includeParams = false) {
        return await this.cheqdOnly.getPublicKey(did, id, includeParams);
      }

      /**
       * Retrieves all public keys by a DID.
       * @param {*} did
       * @param {boolean} [includeParams=false]
       * @returns {Promise<Map<TypedNumber, PublicKey>>}
       */
      async getAllPublicKeysByDid(did, includeParams) {
        return await this.cheqdOnly.getAllPublicKeysByDid(did, includeParams);
      }

      async lastPublicKeyId(targetDid) {
        return option(TypedUUID).from(
          (
            await this.cheqdOnly.latestResourceMetadataBy(
              targetDid,
              this.cheqdOnly.filterPublicKeyMetadata,
            )
          )?.id,
        );
      }

      async nextPublicKeyId(_) {
        return TypedUUID.random();
      }
    },
  };

  return obj[name];
}
