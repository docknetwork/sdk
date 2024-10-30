import { withExtendedPrototypeProperties } from '../../../utils';

class ApiProvider {
  /**
   * Returns array of the methods supported by the given API.
   * @returns {Array<string>}
   */
  methods() {
    throw new Error('Unimplemented');
  }

  /**
   * Returns `true` is the API was initialized.
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
  ['methods', 'isInitialized', 'stateChangeBytes', 'signAndSend'],
  ApiProvider,
);
