// Abstraction over a map of DID -> Key
export default class DidKeys {
  constructor(map) {
    this.map = map || new Map();
  }

  set(key, value) {
    this.map.set(key, value);
  }

  toMap() {
    return this.map;
  }

  /**
   * Get signatures used for authentication of the update to the registry.
   * @param message
   * @returns {Map<any, any>}
   */
  getSignatures(message) {
    throw new Error(`getSignatures method must be implemented in child class! ${message}`);
  }
}
