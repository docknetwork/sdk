import dock from './dock-sdk';
import {validateDockDIDSS58Identifier, DockDIDMethod} from './utils/did';

/**
 * Returns a resolver object. This is how it is supposed to work with the DID resolver here https://github.com/decentralized-identity/did-resolver.
 * @param {string} fullNodeWsRPCEndpoint - The endpoint where a full node is running
 * @returns {object} An object with one key which the Dock DID method
 */
function getResolver(fullNodeWsRPCEndpoint) {

  async function resolve (did, parsed) {
    if (parsed.method != DockDIDMethod) {
      throw new Error(`Found unknown method ${parsed.method}. Can only parse method ${DockDIDMethod}.`);
    }
    validateDockDIDSS58Identifier(parsed.id);

    // Initialize the SDK if it has not been initialized before.
    if (!dock.isConnected()) {
      await dock.init(fullNodeWsRPCEndpoint);
    }
    return dock.did.getDocument(parsed.did);
  }

  return { [DockDIDMethod]: resolve };
}

export {getResolver};
