import {
  withExtendedPrototypeProperties,
  withExtendedStaticProperties,
} from '../../../utils';
import AbstractBaseModule from './base-module';

class AbstractWithParamsAndPublicKeys extends AbstractBaseModule {
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

  /**
   * Retrieves latest public key identifier used by the supplied DID.
   * @param {*} did
   * @returns {Promise<Id>}
   */
  async lastPublicKeyId(_targetDid) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves next public key identifier that can be used by the supplied DID.
   * @param {*} did
   * @returns {Promise<Id>}
   */
  async nextPublicKeyId(_targetDid) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves latest params identifier used by the supplied DID.
   * @param {*} did
   * @returns {Promise<Id>}
   */
  async lastParamsId(_targetDid) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves next params identifier that can be used by the supplied DID.
   * @param {*} did
   * @returns {Promise<Id>}
   */
  async nextParamsId(_targetDid) {
    throw new Error('Unimplemented');
  }
}

/**
 * Abstract logic allowing to operate with public keys and parameters.
 */
export default withExtendedPrototypeProperties(
  [
    'addParamsTx',
    'addPublicKeyTx',
    'removeParamsTx',
    'removePublicKeyTx',
    'getParams',
    'getPublicKey',
    'getAllParamsByDid',
    'getAllPublicKeysByDid',
    'lastPublicKeyId',
    'nextPublicKeyId',
    'lastParamsId',
    'nextParamsId',
  ],
  withExtendedStaticProperties(
    ['PublicKey', 'Params'],
    AbstractWithParamsAndPublicKeys,
  ),
);
