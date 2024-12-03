import {
  DockDidOrDidMethodKey,
  DockDid,
  ServiceEndpoint,
  ServiceEndpointId,
  DidKey,
  DidMethodKey,
  ServiceEndpoints,
  DidKeys,
  Controllers,
  StoredDidDetails,
} from '@docknetwork/credential-sdk/types';
import {
  option,
  TypedNumber,
  TypedTuple,
} from '@docknetwork/credential-sdk/types/generic';
import {
  NoDIDError,
  NoOffchainDIDError,
  NoOnchainDIDError,
} from '@docknetwork/credential-sdk/modules/abstract/did';
import { maybeToHuman } from '@docknetwork/credential-sdk/utils';
import { DidMethodKeyDetails } from '@docknetwork/credential-sdk/types/did/onchain';
import {
  AddServiceEndpoint,
  AddKeys,
  AddControllers,
  RemoveKeys,
  RemoveControllers,
  RemoveServiceEndpoint,
  RemoveOnchainDid,
} from './actions';
import createInternalDockModule from '../common/create-internal-dock-module';

const didMethods = {
  addKeys: (keys, targetDid, _, nonce) => {
    const did = DockDid.from(targetDid).asDid;

    return new AddKeys(did, keys, nonce);
  },

  addControllers: (controllers, targetDid, _, nonce) => {
    const did = DockDid.from(targetDid).asDid;

    return new AddControllers(did, controllers, nonce);
  },

  addServiceEndpoint: (id, types, origins, targetDid, _, nonce) => new AddServiceEndpoint(
    DockDid.from(targetDid).asDid,
    id,
    new ServiceEndpoint(types, origins),
    nonce,
  ),

  removeKeys: (keys, targetDid, _, nonce) => {
    const did = DockDid.from(targetDid).asDid;

    return new RemoveKeys(did, keys, nonce);
  },

  removeControllers: (controllers, targetDid, _, nonce) => {
    const did = DockDid.from(targetDid).asDid;

    return new RemoveControllers(did, controllers, nonce);
  },

  removeServiceEndpoint: (spId, _, nonce) => {
    const [did, id] = ServiceEndpointId.from(spId);

    return new RemoveServiceEndpoint(did.asDock, id, nonce);
  },

  removeOnchainDid: (targetDid, _, nonce) => {
    const did = DockDid.from(targetDid).asDid;

    return new RemoveOnchainDid(did, nonce);
  },
};

const accountMethods = {
  /**
   * Creates transaction to create a new off-chain DID
   * @param did -
   * @param {OffChainDidDocRef} didDocRef - Off chain reference for the DID
   * @returns {*}
   */
  newOffchain: (did, didDocRef) => {
    const hexId = DockDid.from(did).asDid;

    return [hexId, didDocRef];
  },
  /**
   * Create a transaction to update the DID Doc reference of the off chain DID
   * @param did
   * @param didDocRef - new reference
   * @returns {*}
   */
  // eslint-disable-next-line sonarjs/no-identical-functions
  setOffchainDidDocRef: (did, didDocRef) => {
    const hexId = DockDid.from(did).asDid;

    return [hexId, didDocRef];
  },
  removeOffchainDid: (did) => [DockDid.from(did).asDid],
  newOnchain: (did, didKeys, controllers) => [
    DockDid.from(did).asDid,
    [...didKeys].map((key) => DidKey.from(key)),
    [...controllers].map((c) => DockDidOrDidMethodKey.from(c)),
  ],
  newDidMethodKey: (didMethodKey) => [
    DidMethodKey.from(didMethodKey).asDidMethodKey,
  ],
};

export default class DockDIDModuleInternal extends createInternalDockModule({
  didMethods,
  accountMethods,
}) {
  static Prop = 'didModule';

  static MethodNameOverrides = {
    removeOnchainDid: 'DidRemoval',
  };

  /**
   * Create a new off-chain DID
   * @param did
   * @param didDocRef - Off chain reference for the DID
   * @returns {Promise<*>}
   */
  async newOffchain(did, didDocRef, params) {
    return await this.send.newOffchain(
      did,
      didDocRef,
      params,
    );
  }

  /**
   * Update the DID Doc reference of the off chain DID
   * @param did
   * @param didDocRef
   * @returns {Promise<*>}
   */
  async setOffchainDidDocRef(
    did,
    didDocRef,
    params,
  ) {
    return await this.send.setOffchainDidDocRef(
      did,
      didDocRef,
      params,
    );
  }

  /**
   * Remove off-chain DID
   * @param did
   * @returns {Promise<*>}
   */
  async removeOffchainDid(did, params) {
    return await this.send.removeOffchainDid(did, params);
  }

  /**
   * Creates a new DID on the Dock chain.
   * @param {string} did - The new DID. Can be a full DID or hex identifier
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param {array} controllers - Array of `Did`s as expected by the Substrate node.
   * @return {Promise<object>} Promise to the pending transaction
   */
  async newOnchain(
    did,
    didKeys,
    controllers,
    params,
  ) {
    return await this.send.newOnchain(did, didKeys, controllers, params);
  }

  /**
   * Creates a new `did:key:` on the Dock chain.
   * @param {{ ed25519: Uint8Array } | { secp256k1: Uint8Array }} did - The new DID. Can be either `PublicKeyEd25519` or `PublicKeySecp256k1`.
   * @return {Promise<object>} Promise to the pending transaction
   */
  async newDidMethodKey(didMethodKey, params) {
    return await this.send.newDidMethodKey(didMethodKey, params);
  }

  /**
   * Add keys to an on-chain DID
   * @param {DidKey[]} didKeys - Array of `DidKey`s as expected by the Substrate node
   * @param targetDid - The DID to which keys are being added
   * @param signerDid - The DID that is adding the keys by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addKeys(didKeys, targetDid, didKeypair, params) {
    return await this.send.addKeys(didKeys, targetDid, didKeypair, params);
  }

  /**
   * Add controllers to an on-chain DID.
   * @param controllers - The DIDs that will control the `targetDid`
   * @param targetDid - The DID to which controllers are being added
   * @param signerDid - The DID that is adding the controllers by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addControllers(
    controllers,
    targetDid,
    didKeypair,
    params,
  ) {
    return await this.send.addControllers(
      controllers,
      targetDid,
      didKeypair,
      params,
    );
  }

  /**
   * Add a new service endpoint
   * @param endpointId - The id of the service endpoint. Each endpoint has a unique id.
   * @param {ServiceEndpointType} endpointType - The type of the endpoint.
   * @param {Array} origins - An array of one of URIs encoded as hex.
   * @param targetDid - The DID to which service endpoint is being added
   * @param signerDid - The DID that is adding the service endpoint by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async addServiceEndpoint(
    endpointId,
    endpointType,
    origins,
    targetDid,
    didKeypair,
    params,
  ) {
    return await this.send.addServiceEndpoint(
      endpointId,
      endpointType,
      origins,
      targetDid,
      didKeypair,
      params,
    );
  }

  /**
   * Remove keys from a DID
   * @param keyIds - Key indices to remove
   * @param targetDid - The DID from which keys are being removed
   * @param signerDid - The DID that is removing the keys by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async removeKeys(keyIds, targetDid, didKeypair, params) {
    return await this.send.removeKeys(keyIds, targetDid, didKeypair, params);
  }

  /**
   * Remove controllers from a DID
   * @param controllers - Controller DIDs to remove.
   * @param targetDid - The DID from which controllers are being removed
   * @param signerDid - The DID that is removing the controllers by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async removeControllers(controllers, targetDid, didKeypair, params) {
    return await this.send.removeControllers(
      controllers,
      targetDid,
      didKeypair,
      params,
    );
  }

  /**
   * Remove a service endpoint from a DID
   * @param endpointId - The endpoint to remove
   * @param targetDid - The DID from which endpoint is being removed
   * @param signerDid - The DID that is removing the endpoint by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @returns {Promise<*>}
   */
  async removeServiceEndpoint(endpointId, didKeypair, params) {
    return await this.send.removeServiceEndpoint(
      endpointId,
      didKeypair,
      params,
    );
  }

  /**
   * Removes an on-chain DID.
   * @param targetDid - The DID being removed
   * @param signerDid - The DID that is removing `targetDid` by signing the payload because it controls `targetDid`
   * @param signingKeyRef - Signer's keypair reference
   * @return {Promise<object>} Promise to the pending transaction
   */
  async removeOnchainDid(
    targetDid,
    didKeypair,
    params,
  ) {
    return await this.send.removeOnchainDid(targetDid, didKeypair, params);
  }

  /**
   * Returns true if DID `controller` is a controller of DID `controlled`, false otherwise
   * @param controlled
   * @param controller
   * @returns {Promise<boolean>}
   */
  async isController(controlled, controller) {
    const controlledDid = DockDid.from(controlled).asDid;
    const controllerDid = DockDidOrDidMethodKey.from(controller);

    return (
      option(TypedNumber).from(
        await this.query.didControllers(controlledDid, controllerDid),
      ) != null
    );
  }

  /**
   * Returns the service endpoint of the DID and known by `endpointId`
   * @param did
   * @param endpointId
   * @returns {Promise}
   */
  async getServiceEndpoint(endpointId) {
    const [owner, id] = ServiceEndpointId.from(endpointId);

    const endpoint = option(ServiceEndpoint).from(
      await this.query.didServiceEndpoints(owner.asDock, id),
    );

    if (endpoint == null) {
      throw new Error(
        `No service endpoint found for did ${owner} and with id ${endpointId}`,
      );
    }

    return endpoint;
  }

  /**
   * Get the `DidKey` for the DID with given key index. Key indices start from 1 and can have holes
   * @param did
   * @param {number} keyIndex
   * @returns {Promise<DidKey>}
   */
  async getDidKey(did, keyIndex) {
    const hexId = DockDid.from(did).asDid;
    const key = option(DidKey).from(await this.query.didKeys(hexId, keyIndex));
    if (key == null) {
      throw new Error(`No key for found did ${did} and key index ${keyIndex}`);
    }

    return key;
  }

  /**
   * Gets the DID detail of an on chain DID
   * the chain and return them. It will throw NoDID if the DID does not exist on
   * chain.
   * @param {string} didIdentifier - DID identifier as hex. Not accepting full DID intentionally for efficiency as these
   * methods are used internally
   * @return {Promise<object>}
   */
  async getOnchainDidDetail(rawDid) {
    const did = DockDid.from(rawDid);
    const resp = option(StoredDidDetails).from(
      await this.query.dids(did.asDid),
    );
    if (resp == null) {
      throw new NoDIDError(String(did));
    }
    if (resp.isOffChain) {
      throw new NoOnchainDIDError(String(did));
    }

    return resp.asOnChain;
  }

  async getDidMethodKeyDetail(did) {
    const didKey = DidMethodKey.from(did);
    const resp = option(DidMethodKeyDetails).from(
      await this.query.didMethodKeys(didKey.asDidMethodKey),
    );
    if (resp == null) {
      throw new NoDIDError(String(didKey));
    }

    return resp;
  }

  /**
   * Gets the DID detail of an on chain DID
   * @param didIdentifier
   * @returns {Promise<{accountId: HexString}>}
   */
  async getOffchainDidDetail(didIdentifier) {
    const did = DockDid.from(didIdentifier);
    const resp = option(StoredDidDetails).from(
      await this.query.dids(did.asDid),
    );
    if (resp == null) {
      throw new NoDIDError(String(did));
    }
    if (resp.isOnChain) {
      throw new NoOffchainDIDError(String(did));
    }

    return resp.asOffChain;
  }

  /**
   * Gets the current nonce for the DID. It will throw error if the DID does not exist on
   * chain or chain returns null response.
   * @param {DockDidOrDidMethodKey} did
   * @return {Promise<number>}
   */
  async nonce(rawDid) {
    const did = DockDidOrDidMethodKey.from(rawDid);

    if (did.isDid) {
      return (await this.getOnchainDidDetail(did)).nonce;
    } else if (did.isDidMethodKey) {
      return (await this.getDidMethodKeyDetail(did)).nonce;
    } else {
      throw new Error(`Invalid did: \`${did}\``);
    }
  }

  /**
   * Gets the nonce that should be used for sending the next transaction by this DID. Its 1 more than the current nonce.
   * @param {DockDidOrDidMethodKey} did
   * @returns {Promise<*>}
   */
  async getNextNonceForDid(did) {
    return (await this.nonce(did)) + 1;
  }

  async controllers(did) {
    const controllers = await this.query.didControllers.entries(
      DockDid.from(did).asDid,
    );

    return Controllers.from(
      controllers.map(([entry]) => maybeToHuman(entry)[1]),
    );
  }

  async serviceEndpoints(did) {
    const typedDid = DockDid.from(did);
    class ServiceEndpointEntry extends TypedTuple {
      static Classes = [ServiceEndpointId, option(ServiceEndpoint)];
    }

    return new ServiceEndpoints(
      (await this.query.didServiceEndpoints.entries(typedDid.asDid))
        .map(([key, value]) => ServiceEndpointEntry.from([
          [typedDid, maybeToHuman(key)[1]],
          maybeToHuman(value),
        ]))
        .filter(([_, sp]) => sp),
    );
  }

  async keys(did) {
    class DidKeyWithId extends TypedTuple {
      static Classes = [TypedNumber, option(DidKey)];
    }

    return new DidKeys(
      (await this.query.didKeys.entries(DockDid.from(did).asDid))
        .map(([key, value]) => DidKeyWithId.from([maybeToHuman(key)[1], maybeToHuman(value)]))
        .filter(([_, pk]) => pk),
    );
  }
}
