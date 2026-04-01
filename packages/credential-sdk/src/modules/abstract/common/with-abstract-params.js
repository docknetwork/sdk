import {
  withExtendedPrototypeProperties,
  withExtendedStaticProperties,
} from '../../../utils';

/**
 * This function takes a class as an argument and returns a new class that extends the input class. The returned class includes additional static methods for preparing parameters and instance methods for adding, retrieving, and managing parameters associated with DIDs (Decentralized Identifiers). The abstract logic allows operations on public keys and parameters.
 * @param {Function} klass - A constructor function or an ES6 class representing the base class to extend.
 * @returns {class} A new class that extends the input class, including additional methods for managing parameters associated with DIDs.
 */
export default function withAbstractParams(klass) {
  const name = `withAbstractParams(${klass.name})`;

  /**
   * This object contains a single property representing a class that extends the provided 'klass'. It includes several static and instance methods for managing parameters associated with DIDs.
   */
  const obj = {
    [name]: class extends klass {
      /**
       * Create an object to add new parameters on chain. This method is responsible for creating an instance of Params with the provided arguments.
       * @param {...*} prepareAddPublicKey - Additional parameters for preparing to add a public key.
       * @param {string} curveType - The type of elliptic curve used in cryptography (e.g., 'Ed25519', 'P-256').
       * @param {string} label - A human-readable string that describes the parameter.
       * @returns {Params} An instance of Params with the provided properties.
       */
      static prepareAddParameters(...args) {
        const { Params } = this;

        return new Params(...args);
      }

      /**
       * Add new parameters associated with a supplied DID to the blockchain. This method signs and sends a transaction that adds parameters to the blockchain.
       * @param {string} id - A unique identifier for the new parameter set to be added.
       * @param {Params} params - The parameters to add, associated with the provided targetDid.
       * @param {*} targetDid - The DID of the entity that owns the parameters being added.
       * @param {DidKeypair} didKeypair - A key pair object for signing transactions related to the parameter addition.
       * @param {object} txParams - Optional transaction parameters, such as a gas limit or fee.
       * @returns {Promise<*>} A promise that resolves with the result of adding parameters to the blockchain.
       */
      async addParams(id, params, targetDid, didKeypair, txParams) {
        return await this.signAndSend(
          await this.addParamsTx(id, params, targetDid, didKeypair),
          txParams,
        );
      }

      /**
       * Retrieve parameters associated with a specific DID and unique identifier from the blockchain. This method should be implemented by the subclass to define the behavior for retrieving parameters.
       * @param {string} did - The DID of the entity whose parameters are being fetched.
       * @param {string} id - A unique identifier for the parameter set to retrieve.
       * @returns {Promise<Params>} A promise that resolves with an instance of Params containing the retrieved information.
       */
      async getParams(_did, _id) {
        throw new Error('Unimplemented');
      }

      /**
       * Retrieve all parameter sets associated with a specific DID from the blockchain. This method should be implemented by the subclass to define the behavior for retrieving parameters.
       * @param {string} did - The DID of the entity whose parameters are being fetched.
       * @returns {Promise<Map<Id, Params>>} A promise that resolves with a Map containing all parameter sets associated with the provided DID.
       */
      async getAllParamsByDid(_did) {
        throw new Error('Unimplemented');
      }

      /**
       * Retrieve the identifier of the most recently used parameter set for a specific DID from the blockchain. This method should be implemented by the subclass to define the behavior for retrieving parameters.
       * @param {*} targetDid - The DID of the entity whose last parameter identifier is being fetched.
       * @returns {Promise<Id>} A promise that resolves with the identifier (Id) of the most recently used parameter set for the provided DID.
       */
      async lastParamsId(_targetDid) {
        throw new Error('Unimplemented');
      }

      /**
       * Retrieve the next available identifier to be used in a parameter set associated with a specific DID from the blockchain. This method should be implemented by the subclass to define the behavior for retrieving parameters.
       * @param {*} targetDid - The DID of the entity whose next parameter identifier is being fetched.
       * @returns {Promise<Id>} A promise that resolves with an Id representing the next available identifier to be used in a parameter set associated with the provided DID.
       */
      async nextParamsId(_targetDid) {
        throw new Error('Unimplemented');
      }
    },
  };

  /**
   * Abstract logic allowing to operate with public keys and parameters.
   */
  return withExtendedPrototypeProperties(
    [
      'addParamsTx',
      'getParams',
      'getAllParamsByDid',
      'lastParamsId',
      'nextParamsId',
    ],
    withExtendedStaticProperties(['Params'], obj[name]),
  );
}
