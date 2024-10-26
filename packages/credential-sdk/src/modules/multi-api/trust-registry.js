import { NamespaceDid, TrustRegistryInfo } from '../../types';
import { AbstractTrustRegistryModule } from '../abstract';
import { injectDispatch } from './common';

/**
 * `Trust Registry` module.
 */
export default class MultiApiTrustRegistryModule extends injectDispatch(
  AbstractTrustRegistryModule,
) {
  /**
   * Retrieves registry with provided identifier owned by supplied convener did.
   * @param {*} did
   * @param {*} id
   * @returns {Promise<*>}
   */
  async getRegistry(did, id) {
    const parsedDid = NamespaceDid.from(did);

    return await this.moduleById(parsedDid).getRegistry(parsedDid, id);
  }

  /**
   * Retrieves all registries owned by supplied convener did.
   * @param {*} did
   * @returns {Promise<*>}
   */
  async getAllRegistriesByDid(did) {
    const parsedDid = NamespaceDid.from(did);

    return await this.moduleById(parsedDid).getAllRegistriesByDid(parsedDid);
  }

  /**
   * Creates new registry.
   *
   * @param {*} id
   * @param {*} info
   * @param {*} schemas
   * @param {*} didKeypair
   * @param {*} params
   * @returns {Promise<*>}
   */
  async createRegistry(id, info, schemas, didKeypair, params) {
    const parsedInfo = TrustRegistryInfo.from(info);

    return await this.moduleById(parsedInfo.convener).createRegistry(
      id,
      parsedInfo,
      schemas,
      didKeypair,
      params,
    );
  }

  /**
   * Updates existing registry.
   *
   * @param {*} id
   * @param {*} info
   * @param {*} schemas
   * @param {*} signerDid
   * @param {*} signingKeyRef
   * @param {*} params
   * @returns {Promise<*>}
   */
  async updateRegistry(id, info, schemas, didKeypair, params) {
    const parsedInfo = TrustRegistryInfo.from(info);

    return await this.moduleById(parsedInfo.convener).updateRegistry(
      id,
      parsedInfo,
      schemas,
      didKeypair,
      params,
    );
  }

  /**
   * Creates new registry.
   *
   * @param {*} id
   * @param {*} info
   * @param {*} schemas
   * @param {*} didKeypair
   * @returns {Promise<*>}
   */
  async createRegistryTx(id, info, schemas, didKeypair) {
    const parsedInfo = TrustRegistryInfo.from(info);

    return await this.moduleById(parsedInfo.convener).createRegistryTx(
      id,
      parsedInfo,
      schemas,
      didKeypair,
    );
  }

  /**
   * Updates existing registry.
   *
   * @param {*} id
   * @param {*} info
   * @param {*} schemas
   * @param {*} signerDid
   * @param {*} signingKeyRef
   * @param {*} params
   * @returns {Promise<*>}
   */
  async updateRegistryTx(id, info, schemas, didKeypair) {
    const parsedInfo = TrustRegistryInfo.from(info);

    return await this.moduleById(parsedInfo.convener).updateRegistryTx(
      id,
      parsedInfo,
      schemas,
      didKeypair,
    );
  }
}
