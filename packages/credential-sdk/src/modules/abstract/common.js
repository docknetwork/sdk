import {
  withExtendedPrototypeProperties,
  withExtendedStaticProperties,
} from '../../utils';

/**
 * Base class that must be extended by all API providers.
 */
export const ApiProvider = withExtendedPrototypeProperties(
  ['isInitialized', 'stateChangeBytes', 'signAndSend'],
  class ApiProvider {
    /**
     * @returns {boolean}
     */
    isInitialized() {
      throw new Error('Unimplemented');
    }

    /**
     * Ensures that the SDK is initialized, throws an error otherwise.
     *
     * @returns {this}
     */
    ensureInitialized() {
      if (!this.isInitialized()) {
        throw new Error('SDK is not initialized.');
      }

      return this;
    }

    /**
     * Ensures that the SDK is not initialized, throws an error otherwise.
     *
     * @returns {this}
     */
    ensureNotInitialized() {
      if (this.isInitialized()) {
        throw new Error('SDK is already initialized.');
      }

      return this;
    }
  },
);

/**
 * Base module class that must be extended by all modules.
 */
export class AbstractBaseModule {
  /**
   * Signs and sends provided extrinsic.
   *
   * @param {*} extrinsic
   * @param {*} params
   * @returns {Promise<*>}
   */
  async signAndSend(extrinsic, params) {
    if (this.apiProvider == null) {
      throw new Error(
        'Can\'t sign a transaction because the module doesn\'t have an `apiProvider`',
      );
    }

    return await this.apiProvider.signAndSend(extrinsic, params);
  }
}

/**
 * Abstract logic allowing to operate with public keys and parameters.
 */
class AbstractWithParamsAndPublicKey extends AbstractBaseModule {
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
   * Add new signature params.
   * @param id - Unique identifier of the new params to be added.
   * @param param - The signature params to add.
   * @param targetDid
   * @param keyPair - Signer's keypair
   * @param signingKeyRef - Reference to the keypair used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async addParams(id, param, targetDid, didKeypair, params) {
    return await this.signAndSend(
      await this.addParamsTx(id, param, targetDid, didKeypair),
      params,
    );
  }

  /**
   * Remove existing BBS+ params.
   * @param id - Identifier of the parameters to be removed.
   * @param targetDid - Target DID associated with the params
   * @param keyPair - Signer's keypair
   * @param signingKeyRef - Reference to the keypair used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @returns {Promise<*>}
   */
  async removeParams(id, targetDid, didKeypair, params) {
    return await this.signAndSend(
      await this.removeParamsTx(id, targetDid, didKeypair),
      params,
    );
  }

  /**
   * Add a public key
   * @param publicKey - public key to add.
   * @param targetDid - The DID to which key is being added
   * @param signerDid - The DID that is adding the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signingKeyRef
   * @returns {Promise<*>}
   */
  async addPublicKey(id, publicKey, targetDid, didKeypair, params) {
    return await this.signAndSend(
      await this.addPublicKeyTx(id, publicKey, targetDid, didKeypair),
      params,
    );
  }

  /**
   * Remove public key
   * @param removeKeyId - Identifier of the public key to be removed.
   * @param targetDid - The DID from which key is being removed
   * @param signerDid - The DID that is removing the key by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's signing key reference
   * @returns {Promise<*>}
   */
  async removePublicKey(id, targetDid, didKeypair, params) {
    return await this.signAndSend(
      await this.removePublicKeyTx(id, targetDid, didKeypair),
      params,
    );
  }

  /**
   * Retrieves params by a DID and unique identifier.
   * @param {*} did
   * @param {*} id
   * @returns {Promise<Params>}
   */
  async getParams(_did, _id) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves all params by a DID
   * @param {*} did
   * @returns {Promise<Map<Id, Params>>}
   */
  async getAllParamsByDid(_did) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves public key by a DID and unique identifier.
   * @param {*} did
   * @param {*} id
   * @returns {Promise<Params>}
   */
  async getPublicKey(_did, _id, _includeParams = false) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves all public keys by a DID
   * @param {*} did
   * @returns {Promise<Map<Id, Params>>}
   */
  async getAllPublicKeysByDid(_did, _includeParams = false) {
    throw new Error('Unimplemented');
  }
}

export const AbstractWithParamsAndPublicKeys = withExtendedPrototypeProperties(
  [
    'addParamsTx',
    'addPublicKeyTx',
    'removeParamsTx',
    'removePublicKeyTx',
    'getParams',
    'getPublicKey',
    'getAllParamsByDid',
    'getAllPublicKeysByDid',
  ],
  withExtendedStaticProperties(
    ['PublicKey', 'Params'],
    AbstractWithParamsAndPublicKey,
  ),
);
