import {
  getStateChange,
  getSignatureFromKeyringPair
} from '../utils/misc';

function getProofFromPairs(didPairs, message) {
  const proof = new Map();
  didPairs.forEach((pair, did) => {
    const sig = getSignatureFromKeyringPair(pair, message);
    proof.set(did, sig.toJSON());
  });
  return proof;
}

/** Class to create, update and destroy revocations */
class RevocationModule {
  /**
   * Creates a new instance of RevocationModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api) {
    this.api = api;
    this.module = api.tx.revoke;
  }

  /**
   * Creating a revocation registry
   * @param {RegistryId} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Registry} registry - Will serialized `registry` and update the map `rev_registries` with `id` -> `(registry, last updated block number)
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  newRegistry(id, policy, addOnly) {
    return this.module.newRegistry(id, {
      policy: policy.toJSON(),
      add_only: addOnly,
    });
  }

  /**
   * Deleting revocation registry
   * @param {RemoveRegistry} removal - contains the registry to remove
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  removeRegistry(registryID, lastModified, didPairs) {
    const removal = {
      registry_id: registryID,
      last_modified: lastModified
    };

    const serializedRemoval = this.getSerializedRemoveRegistry(removal);
    const proof = getProofFromPairs(didPairs, serializedRemoval); // TODO: expose getProofFromPairs and pass proof as parameter
    return this.module.removeRegistry(removal, proof);
  }

  /**
   * Revoke credentials
   * @param {Revoke} revoke - contains the credentials to be revoked
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  revoke(registryID, revokeIds, lastModified, didPairs) {
    const revoke = {
      registry_id: registryID,
      revoke_ids: revokeIds,
      last_modified: lastModified
    };

    const serializedRevoke = this.getSerializedRevoke(revoke);
    const proof = getProofFromPairs(didPairs, serializedRevoke);
    return this.module.revoke(revoke, proof);
  }

  /**
   * Unrevoke credentials
   * @param {UnRevoke} unrevoke - contains the credentials to be revoked
   * @param {PAuth} proof - The proof
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  unrevoke(registryID, revokeIds, lastModified, didPairs) {
    const unrevoke = {
      registry_id: registryID,
      revoke_ids: revokeIds,
      last_modified: lastModified
    };

    const serializedRevoke = this.getSerializedUnrevoke(unrevoke);
    const proof = getProofFromPairs(didPairs, serializedRevoke);
    return this.module.unrevoke(unrevoke, proof);
  }

  /**
   * The read-only call get_revocation_registry is used to get details of the revocation registry like controllers, policy and type. If the registry is not present, None is returned.
   * @param {RegistryId} registryID - Revocation registry ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  async getRevocationRegistry(registryID) {
    const detail = await this.getRegistryDetail(registryID);
    return detail[0];
  }

  async getRegistryDetail(registryID) {
    const resp = await this.api.query.revoke.registries(registryID);
    if (resp) {
      if (resp.isNone) {
        throw new Error('Could not find revocation registry: ' + registryID);
      }

      const respTuple = resp.unwrap();
      if (respTuple.length === 2) {
        return [
          respTuple[0],
          respTuple[1].toNumber()
        ];
      } else {
        throw new Error('Needed 2 items in response but got' + respTuple.length);
      }
    }
  }

  /**
   * The read-only call get_revocation_status is used to check whether a credential is revoked or not and does not consume any tokens. If
   * @param {RegistryId} registryID - Revocation registry ID
   * @param {RevokeId} revokeId - Credential ID
   * @return {Extrinsic} The extrinsic to sign and send.
   */
  async getRevocationStatus(registryID, revokeID) {
    const resp = await this.api.query.revoke.revocations(registryID, revokeID);
    if (resp) {
      return !resp.isNone;
    }
  }

  /**
   * Serializes a `Revoke` for signing.
   * @param {object} revoke - `Revoke` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedRevoke(revoke) {
    return getStateChange(this.api, 'Revoke', revoke);
  }

  /**
   * Serializes a `Unrevoke` for signing.
   * @param {object} unrevoke - `Unrevoke` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedUnrevoke(unrevoke) {
    return getStateChange(this.api, 'Unrevoke', unrevoke);
  }

  /**
   * Serializes a `RemoveRegistry` for signing.
   * @param {object} removeReg - `RemoveRegistry` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedRemoveRegistry(removeReg) {
    return getStateChange(this.api, 'RemoveRegistry', removeReg);
  }
}

export default RevocationModule;
