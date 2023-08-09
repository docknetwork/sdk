import StatusList2021Credential from '../status-list-credential/status-list-2021-credential';
import {
  getNonce,
  getSignatureFromKeyringPair,
  getStateChange,
} from '../utils/misc';

import { createDidSig, getHexIdentifierFromDID } from '../utils/did';

export default class StatusListCredentialModule {
  /**
   * Creates a new instance of StatusListCredential and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   * @param signAndSend
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.module = api.tx.statusListCredential;
    this.signAndSend = signAndSend;
  }

  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} credentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async fetchStatusList2021Credential(credentialId) {
    let credential = await this.api.query.statusListCredential.statusListCredentials(credentialId);

    if (credential.isSome) {
      credential = credential.unwrap().statusListCredential;

      if (credential.isStatusList2021Credential) {
        return StatusList2021Credential.fromBytes(credential.asStatusList2021Credential);
      } else {
        throw new Error('Fetched credential isn\'t of `StatusList2021Credential` type');
      }
    }

    return null;
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {StatusList2021Credential} statusListCredential - the credential to be associated with the given `id`
   * @param {Policy} policy - the credential policy
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  buildCreateStatusListCredentialTx(id, statusListCredential, policy) {
    const credentialWithPolicy = {
      statusListCredential: statusListCredential.toSubstrate(),
      policy: policy.toJSON(),
    };

    return this.module.create(id, credentialWithPolicy);
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param {StatusList2021Credential} credential - the credential to be associated with the given `id`
   * @param {Array<*>} didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  buildUpdateStatusListCredentialTx(statusListCredentialUpdate, didSigs) {
    return this.module.update(statusListCredentialUpdate, didSigs);
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {Array<*>} didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  buildRemoveStatusListCredentialTx(statusListCredentialId, didSigs) {
    return this.module.remove(statusListCredentialId, didSigs);
  }

  /**
   * Create a new status list credential on-chain.
   * @param {string} id - is the unique id of the registry. The function will check whether `id` is already taken or not.
   * @param {StatusList2021Credential} credential - The credential to be associated with the given `id`
   * @param {Policy} policy - The credential policy
   * @return {Promise<*>} - Sent transaction
   */
  createStatusListCredential(
    id,
    statusListCredential,
    policy,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.buildCreateStatusListCredentialTx(id, statusListCredential, policy),
      waitForFinalization,
      params,
    );
  }

  /**
   * Update a single `StatusListCredential`. Works only with credentials having `OneOf` policy
   * @param id
   * @param credential
   * @param did
   * @param keyPair
   * @param keyId
   * @param nonce
   * @param didModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<Object>}
   */
  async updateStatusListCredentialWithOneOfPolicy(
    id,
    credential,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const [payload, sig, sigNonce] = await this.createSignedUpdateStatusListCredential(
      id,
      credential,
      did,
      keyPair,
      keyId,
      { nonce, didModule },
    );
    return this.updateStatusListCredential(
      payload,
      [[sig, sigNonce]],
      waitForFinalization,
      params,
    );
  }

  /**
   * Remove a single `StatusListCredential`. Works only with credentials having `OneOf` policy
   * @param id
   * @param did
   * @param keyPair
   * @param keyId
   * @param nonce
   * @param didModule
   * @param waitForFinalization
   * @param params
   * @returns {Promise<Object>}
   */
  async removeStatusListCredentialWithOneOfPolicy(
    id,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const [payload, sig, sigNonce] = await this.createSignedRemoveStatusListCredential(
      id,
      did,
      keyPair,
      keyId,
      { nonce, didModule },
    );
    return this.removeStatusListCredential(
      payload,
      [[sig, sigNonce]],
      waitForFinalization,
      params,
    );
  }

  /**
   * Updates status list credential.
   *
   * @param updateStatusListCredential
   * @param didSigs
   * @param waitForFinalization
   * @param params
   */
  updateStatusListCredential(
    updateStatusListCredential,
    didSigs,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.buildUpdateStatusListCredentialTx(
        updateStatusListCredential,
        didSigs,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Removes status list credential.
   *
   * @param statusListCredentialId
   * @param didSigs
   * @param waitForFinalization
   * @param params
   */
  removeStatusListCredential(
    statusListCredentialId,
    didSigs,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.buildRemoveStatusListCredentialTx(
        statusListCredentialId,
        didSigs,
      ),
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates `DID` signature.
   *
   * @param func
   * @param data
   * @param did
   * @param keyPair
   * @param keyId
   */
  async createDidSignature(
    func,
    data,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
  ) {
    const hexDid = getHexIdentifierFromDID(did);
    // eslint-disable-next-line no-param-reassign
    nonce = await getNonce(hexDid, nonce, didModule);

    const update = {
      data,
      nonce,
    };
    const serializedTx = func.call(this, update);
    const signature = getSignatureFromKeyringPair(keyPair, serializedTx);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [data, didSig, nonce];
  }

  /**
   * Creates signed transaction to update status list credential.
   *
   * @param id
   * @param credential
   * @param did
   * @param keyPair
   * @param keyId
   */
  async createSignedUpdateStatusListCredential(
    id,
    credential,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
  ) {
    return this.createDidSignature(
      this.getSerializedUpdateStatusListCredential,
      { id, credential: credential.toSubstrate() },
      did,
      keyPair,
      keyId,
      { nonce, didModule },
    );
  }

  /**
   * Creates signed transaction to remove status list credential.
   *
   * @param id
   * @param credential
   * @param did
   * @param keyPair
   * @param keyId
   */
  async createSignedRemoveStatusListCredential(
    id,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
  ) {
    return this.createDidSignature(
      this.getSerializedRemoveStatusListCredential,
      { id },
      did,
      keyPair,
      keyId,
      { nonce, didModule },
    );
  }

  /**
   * Serializes a `UpdateStatusListCredential` for signing.
   * @param {object} update - `UpdateStatusListCredential` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedUpdateStatusListCredential(update) {
    return getStateChange(this.api, 'UpdateStatusListCredential', update);
  }

  /**
   * Serializes a `RemoveStatusListCredential` for signing.
   * @param {object} removal - `RemoveStatusListCredential` as expected by the Substrate node
   * @returns {Array} An array of Uint8
   */
  getSerializedRemoveStatusListCredential(removal) {
    return getStateChange(this.api, 'RemoveStatusListCredential', removal);
  }
}
