import StatusList2021Credential from '../status-list-credential/status-list2021-credential';
import {
  getNonce,
  getSignatureFromKeyringPair,
  getStateChange,
} from '../utils/misc';

import { createDidSig, getHexIdentifierFromDID } from '../utils/did';

/**
 * Module supporting `StatusList2021Credential` and `RevocationList2020Credential`.
 */
export default class StatusListCredentialModule {
  /**
   * Creates a new instance of `StatusListCredentialModule` and sets the api
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
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async fetchStatusList2021Credential(statusListCredentialId) {
    let statusListCredential = await this.api.query.statusListCredential.statusListCredentials(
      statusListCredentialId,
    );

    if (statusListCredential.isSome) {
      statusListCredential = statusListCredential.unwrap().statusListCredential;

      if (statusListCredential.isStatusList2021Credential) {
        return StatusList2021Credential.fromBytes(
          statusListCredential.asStatusList2021Credential,
        );
      } else {
        throw new Error(
          "Fetched credential isn't of `StatusList2021Credential` type",
        );
      }
    }

    return null;
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @param policy - the credential policy
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
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  buildUpdateStatusListCredentialTx(statusListCredentialUpdate, didSigs) {
    return this.module.update(statusListCredentialUpdate, didSigs);
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  buildRemoveStatusListCredentialTx(statusListCredentialId, didSigs) {
    return this.module.remove(statusListCredentialId, didSigs);
  }

  /**
   * Create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - The status list credential to be associated with the given `id`.
   * @param policy - The credential policy.
   * @param waitForFinalization
   * @param params
   * @return {Promise<*>} - Sent transaction.
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
   * @param id - Unique identifier of the status list credential.
   * @param statusListCredential - Status list credential.
   * @param did - Signer of the transaction payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
   * @param waitForFinalization
   * @param params
   * @returns {Promise<Object>}
   */
  async updateStatusListCredentialWithOneOfPolicy(
    id,
    statusListCredential,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
    waitForFinalization = true,
    params = {},
  ) {
    const [payload, sig, sigNonce] = await this.createSignedUpdateStatusListCredential(
      id,
      statusListCredential,
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
   * @param id - Unique identifier of the status list credential.
   * @param did - Signer of the transaction payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * using this
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
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
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
   * @param id - Unique identifier of the status list credential.
   * @param didSigs - Array of pairs with each pair of the form `[DidSig, nonce]` where `nonce` is the nonce used while
   * signing the payload
   * @param waitForFinalization
   * @param params
   */
  removeStatusListCredential(
    id,
    didSigs,
    waitForFinalization = true,
    params = {},
  ) {
    return this.signAndSend(
      this.buildRemoveStatusListCredentialTx(id, didSigs),
      waitForFinalization,
      params,
    );
  }

  /**
   * Creates `DID` signature.
   *
   * @param createSerializedTx - Function to create a serialized transaction using supplied payload.
   * @param data - Payload data.
   * @param did - Signer of the transaction payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * @param params - parameters to be used
   */
  async createDidSignature(
    createSerializedTx,
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
    const serializedTx = createSerializedTx.call(this, update);
    const signature = getSignatureFromKeyringPair(keyPair, serializedTx);
    const didSig = createDidSig(hexDid, keyId, signature);
    return [data, didSig, nonce];
  }

  /**
   * Creates signed transaction to update status list credential.
   *
   * @param id - Unique identifier of the status list credential.
   * @param statusListCredential - Status list credential.
   * @param did - Signer of the transaction payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
   * @param params - parameters to be used
   */
  async createSignedUpdateStatusListCredential(
    id,
    statusListCredential,
    did,
    keyPair,
    keyId,
    { nonce = undefined, didModule = undefined },
  ) {
    return this.createDidSignature(
      this.getSerializedUpdateStatusListCredential,
      { id, credential: statusListCredential.toSubstrate() },
      did,
      keyPair,
      keyId,
      { nonce, didModule },
    );
  }

  /**
   * Creates signed transaction to remove status list credential.
   *
   * @param id - Unique identifier of the status list credential.
   * @param did - Signer of the transaction payload
   * @param keyPair - Signer's keypair
   * @param keyId - The key id used by the signer. This will be used by the verifier (node) to fetch the public key for verification
   * @param nonce - The nonce to be used for sending this transaction. If not provided then `didModule` must be provided.
   * @param didModule - Reference to the DID module. If nonce is not provided then the next nonce for the DID is fetched by
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
