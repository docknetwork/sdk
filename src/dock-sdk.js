import DID from './modules/did';

class DockSDK {
  /**
   * Skeleton constructor, does nothing yet
   * @constructor
   * @param {string} address - WebSocket Address
   */
  constructor(address) {
    this.address = address;
  }

  /**
   * Returns a string.
   * @return {string} The address value.
   */
  foo() {
    return this.address;
  }
}

export const DIDModule = DID;
export default DockSDK;
