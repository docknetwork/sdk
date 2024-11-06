import {
  TypedNumber,
  TypedMap,
} from "@docknetwork/credential-sdk/types/generic";
import injectDock from "./inject-dock";

/**
 * Wraps supplied class into a class with logic for public keys and corresponding setup parameters.
 */
/* eslint-disable sonarjs/cognitive-complexity */
export default function withPublicKeys(klass) {
  const name = `withPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Add a public key
       * @param publicKey - public key to add.
       * @param targetDid - The DID to which key is being added
       * @param didKeypair - Signer's didKeypair
       * @returns {Promise<*>}
       */
      async addPublicKeyTx(_id, publicKey, targetDid, didKeypair) {
        return await this.dockOnly.tx.addPublicKey(
          publicKey,
          targetDid,
          didKeypair
        );
      }

      /**
       * Retrieves all public keys by a DID.
       * @param {*} did
       * @param {boolean} withParams - If true, return the params referenced by the public key.
       * @returns {Promise<Map<TypedNumber, PublicKey>>}
       */
      async getAllPublicKeysByDid(did, includeParams = false) {
        return await this.dockOnly.getAllPublicKeysByDid(did, includeParams);
      }

      /**
       *
       * @param did
       * @param keyId
       * @param withParams - If true, return the params referenced by the public key.
       * @returns {Promise<{bytes: string}|null>}
       */
      async getPublicKey(did, keyId, includeParams = false) {
        return await this.dockOnly.getPublicKey(did, keyId, includeParams);
      }

      async lastPublicKeyId(targetDid) {
        return await this.dockOnly.keysCounter(targetDid);
      }

      async nextPublicKeyId(targetDid) {
        return (await this.lastPublicKeyId(targetDid)).inc();
      }
    },
  };

  return obj[name];
}
