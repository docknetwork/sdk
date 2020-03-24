import dock from './dock-sdk';
import {validateDockDIDSS58Identifier, DockDIDMethod} from './utils/did';

/**
 * Returns a resolver object. This is how it is supposed to work with the DID resolver here https://github.com/decentralized-identity/did-resolver.
 * @param {string} fullNodeWsRPCEndpoint - The endpoint where a full node is running
 * @returns {object} An object with one key which the Dock DID method
 */
function getResolver(fullNodeWsRPCEndpoint) {
  // This is initialized the first time when `resolve` is called.
  let sdk;

  async function resolve (did, parsed) {
    if (parsed.method != DockDIDMethod) {
      throw new Error(`Found unknown method ${parsed.method}. Can only parse method ${DockDIDMethod}.`);
    }
    validateDockDIDSS58Identifier(parsed.id);

    // Initialize the SDK if it has not been initialized before.
    if (!sdk) {
      sdk = await dock.init(fullNodeWsRPCEndpoint);
    } else {
      return await sdk.did.getDocument(parsed.id);
    }
  }

  return { [DockDIDMethod]: resolve };
}
