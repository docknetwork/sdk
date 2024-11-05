import { withExtendedStaticProperties } from "../../../utils";

export default function withPublicKeys(klass) {
  const name = `withPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends klass {
      /**
       * Create object to add new public key on chain
       * @param bytes
       * @param curveType
       * @param paramsRef - Provide if this public key was created using params present on chain.
       * @returns {{}}
       */
      static prepareAddPublicKey(...args) {
        const { PublicKey } = this;

        return new PublicKey(...args);
      }

      /**
       * Add a public key
       * @param id - public key id.
       * @param publicKey - public key to add.
       * @param targetDid - The DID to which key is being added
       * @param signerDid - The DID that is adding the key by signing the payload because it controls `targetDid`
       * @param signingKeyRef - Signer's signingKeyRef
       * @returns {Promise<*>}
       */
      async addPublicKey(id, publicKey, targetDid, didKeypair, params) {
        return await this.signAndSend(
          await this.addPublicKeyTx(id, publicKey, targetDid, didKeypair),
          params
        );
      }

      /**
       * Remove public key
       * @param id - Identifier of the public key to be removed.
       * @param targetDid - The DID from which key is being removed
       * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
       * @param signingKeyRef - Signer's signing key reference
       * @returns {Promise<*>}
       */
      async removePublicKey(id, targetDid, didKeypair, params) {
        return await this.signAndSend(
          await this.removePublicKeyTx(id, targetDid, didKeypair),
          params
        );
      }

      /**
       * Retrieves public key by a DID and unique identifier.
       * @param {*} did
       * @param {*} id
       * @returns {Promise<Params>}
       */
      async getPublicKey(_did, _id, _includeParams = false) {
        throw new Error("Unimplemented");
      }

      /**
       * Retrieves all public keys by a DID
       * @param {*} did
       * @returns {Promise<Map<Id, Params>>}
       */
      async getAllPublicKeysByDid(_did, _includeParams = false) {
        throw new Error("Unimplemented");
      }

      /**
       * Retrieves latest public key identifier used by the supplied DID.
       * @param {*} did
       * @returns {Promise<Id>}
       */
      async lastPublicKeyId(_targetDid) {
        throw new Error("Unimplemented");
      }

      /**
       * Retrieves next public key identifier that can be used by the supplied DID.
       * @param {*} did
       * @returns {Promise<Id>}
       */
      async nextPublicKeyId(_targetDid) {
        throw new Error("Unimplemented");
      }
    },
  };

  /**
   * Abstract logic allowing to operate with public keys and parameters.
   */
  return withExtendedPrototypeProperties(
    [
      "addPublicKeyTx",
      "removePublicKeyTx",
      "getPublicKey",
      "getAllPublicKeysByDid",
      "lastPublicKeyId",
      "nextPublicKeyId",
    ],
    withExtendedStaticProperties(["PublicKey"], obj[name])
  );
}
