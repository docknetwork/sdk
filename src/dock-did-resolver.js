import dock from './api';
import {validateDockDIDSS58Identifier, DockDIDMethod} from './utils/did';

/**
 * Returns a resolver object. This is how it is supposed to work with the DID resolver here https://github.com/decentralized-identity/did-resolver.
 * @param {string} fullNodeWsRPCEndpoint - The endpoint where a full node is running
 * @returns {object} An object with one key which the Dock DID method
 */
function getResolver(fullNodeWsRPCEndpoint) {

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @param {object} parsed - Object containing the full DID, the identifier, method
   * @returns {object} An object with only 1 key as the Dock DID method and the value as the resolve function
   */
  async function resolve (did, parsed) {
    if (parsed.method != DockDIDMethod) {
      throw new Error(`Found unknown method ${parsed.method}. Can only parse method ${DockDIDMethod}.`);
    }
    validateDockDIDSS58Identifier(parsed.id);

    // Initialize the SDK if it has not been initialized before.
    if (!dock.isInitialized()) {
      await dock.init(fullNodeWsRPCEndpoint);
    }
    return dock.did.getDocument(parsed.did);
  }

  return { [DockDIDMethod]: resolve };
}

export {getResolver};
