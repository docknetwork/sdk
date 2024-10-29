import { withExtendedPrototypeProperties } from '../../../utils';

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
      throw new Error('SDK is not initialized');
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
      throw new Error('SDK is already initialized');
    }

    return this;
  }
}

/**
 * Base class that must be extended by all API providers.
 */
export default withExtendedPrototypeProperties(
  ['isInitialized', 'stateChangeBytes', 'signAndSend'],
  ApiProvider,
);
