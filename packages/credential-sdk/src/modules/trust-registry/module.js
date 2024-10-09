import { withExtendedPrototypeProperties } from '../../utils';
import { AbstractBaseModule } from '../common';

/**
 * `Trust Registry` module.
 */
class AbstractTrustRegistryModule extends AbstractBaseModule {
  /**
   * Retrieves registry with provided identifier owned by supplied convener did.
   * @param {*} did
   * @param {*} id
   */
  async getRegistry(_did, _id) {
    throw new Error('Unimplemented');
  }

  /**
   * Retrieves all registries owned by supplied convener did.
   * @param {*} did
   */
  async getAllRegistriesByDid(_did) {
    throw new Error('Unimplemented');
  }

  /**
   * Creates new registry.
   *
   * @param {*} id
   * @param {*} info
   * @param {*} schemas
   * @param {*} didKeypair
   * @param {*} params
   * @returns Promise<*>
   */
  async createRegistry(id, info, schemas, didKeypair, params) {
    return await this.signAndSend(
      await this.createRegistryTx(id, info, schemas, didKeypair),
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
   * @returns Promise<*>
   */
  async updateRegistry(id, info, schemas, didKeypair, params) {
    return await this.signAndSend(
      await this.updateRegistryTx(id, info, schemas, didKeypair),
      params,
    );
  }
}

export default withExtendedPrototypeProperties(
  [
    'getRegistry',
    'getAllRegistriesByDid',
    'createRegistryTx',
    'updateRegistryTx',
  ],
  AbstractTrustRegistryModule,
);
