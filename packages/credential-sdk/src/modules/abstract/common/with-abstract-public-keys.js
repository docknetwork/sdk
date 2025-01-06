import {
  withExtendedPrototypeProperties,
  withExtendedStaticProperties,
} from '../../../utils';

/**
 * Higher-order function that enhances a given class with abstract public key functionality.
 * @template C
 * @param {C} klass - The class to be enhanced.
 * @returns {C} A new class extended from the input class with added methods and properties.
 */
export default function withAbstractPublicKeys(klass) {
  const name = `withAbstractPublicKeys(${klass.name})`;

  /**
   * An object containing a single property that references an anonymous subclass of the input class.
   * This subclass includes methods for handling public keys and their parameters.
   */
  const obj = {
    [name]: class extends klass {
      /**
       * Static method to prepare an object representing a new public key to be added on the chain.
       * @param {...*} args - Variable list of arguments for creating a PublicKey instance, typically including bytes and curveType.
       * @returns {PublicKey} The newly created PublicKey object.
       */
      static prepareAddPublicKey(...args) {
        const { PublicKey } = this;

        return new PublicKey(...args);
      }

      /**
       * Asynchronously adds a public key to the blockchain.
       * @param {*} id - The unique identifier for the public key.
       * @param {PublicKey} publicKey - The public key to be added.
       * @param {*} targetDid - The Distributed Identity (DID) of the entity to which the key is being added.
       * @param {DidKeypair} didKeypair - A reference to the private key used for signing the transaction.
       * @param {object} params - transcation parameters.
       * @returns {Promise<*>} A Promise that resolves with the result of the addPublicKeyTx() method after being signed and sent.
       */
      async addPublicKey(id, publicKey, targetDid, didKeypair, params) {
        return await this.signAndSend(
          await this.addPublicKeyTx(id, publicKey, targetDid, didKeypair),
          params,
        );
      }

      /**
       * Retrieves a single public key by its identifier and the DID of the entity it belongs to.
       * @param {*} _did - The DID of the entity that owns or controls the requested key (currently unused in function body).
       * @param {*} id - The unique identifier for the desired public key.
       * @param {boolean} includeParams - Request params for the public key.
       * @returns {Promise<Params>} A Promise that resolves with the parameters associated with the requested public key, if found. Otherwise, it rejects or returns null/undefined.
       */
      async getPublicKey(_did, _id, _includeParams = false) {
        throw new Error('Unimplemented');
      }

      /**
       * Retrieves all public keys associated with a given DID.
       * @param {*} did - The DID of the entity whose public keys are being requested.
       * @param {boolean} includeParams - Request params for the public key.
       * @returns {Promise<Map<Id, Params>>} A Promise that resolves with a map containing all public key identifiers and their respective parameters for the specified DID. If no keys or an error occurs, it may return null/undefined or reject the promise.
       */
      async getAllPublicKeysByDid(_did, _includeParams = false) {
        throw new Error('Unimplemented');
      }

      /**
       * Retrieves the identifier of the most recently used public key for a given DID.
       * @param {*} targetDid - The DID whose latest public key is being requested.
       * @returns {Promise<Id>} A Promise that resolves with the ID of the latest public key associated with the provided DID, if available. Otherwise, it may reject or return null/undefined.
       */
      async lastPublicKeyId(_targetDid) {
        throw new Error('Unimplemented');
      }

      /**
       * Retrieves the identifier of the next unused public key for a given DID.
       * @param {*} targetDid - The DID whose next available public key ID is being requested.
       * @returns {Promise<Id>} A Promise that resolves with the ID of the next usable public key associated with the provided DID, if it exists. Otherwise, it may reject or return null/undefined.
       */
      async nextPublicKeyId(_targetDid) {
        throw new Error('Unimplemented');
      }
    },
  };

  return withExtendedPrototypeProperties(
    [
      'addPublicKeyTx',
      'getAllPublicKeysByDid',
      'lastPublicKeyId',
      'nextPublicKeyId',
    ],
    withExtendedStaticProperties(['PublicKey'], obj[name]),
  );
}
