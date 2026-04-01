import AbstractApiProvider from './abstract-api-provider';
import {
  ensureInstanceOf,
  withExtendedPrototypeProperties,
} from '../../../utils';

class AbstractBaseModule {
  constructor(apiProvider) {
    if (apiProvider != null) {
      this.apiProvider = ensureInstanceOf(apiProvider, AbstractApiProvider);
    }
  }

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
        `Can't sign transaction because \`${this.constructor.name}\` doesn't have an associated \`apiProvider\``,
      );
    }

    return await this.apiProvider.signAndSend(extrinsic, params);
  }
}

/**
 * Base module class that must be extended by all modules.
 */
export default withExtendedPrototypeProperties(['methods'], AbstractBaseModule);
