// Abstraction over a map of DID -> Key
export default class DidKeys {
  /**
   * Constructs a DidKeys map abstraction
   * @param {Map} [map] - Key map
   * @constructor
   */
  constructor(map = null) {
    this.map = map || new Map();
  }

  /**
   * Set signature by key/value
   * @param {string} key - Key for map
   * @param {any} value - Value for map
   */
  set(key, value) {
    this.map.set(key, value);
  }

  /**
   * Converts policy to JSON object
   * @returns {Map}
   */
  toMap() {
    return this.map;
  }

  /**
   * Get signatures used for authentication of the update to the registry.
   * @param {any} message - Message to sign
   * @returns {Map<any, any>}
   */
  getSignatures(message) {
    throw new Error(`getSignatures method must be implemented in child class! ${message}`);
  }
}
