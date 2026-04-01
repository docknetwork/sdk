import { AbstractStatusListCredentialModule } from '../abstract';
import { StatusListCredentialId } from '../../types';
import { injectModuleRouter } from './common';

export default class MultiApiStatusListCredentialModule extends injectModuleRouter(
  AbstractStatusListCredentialModule,
) {
  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async getStatusListCredential(statusListCredentialId) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).getStatusListCredential(id);
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async createStatusListCredentialTx(
    statusListCredentialId,
    statusListCredential,
    didKeypair,
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).createStatusListCredentialTx(
      id,
      statusListCredential,
      didKeypair,
    );
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didKeypair - `DID` signing key(s)
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredentialTx(
    statusListCredentialId,
    statusListCredential,
    didKeypair,
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).updateStatusListCredentialTx(
      id,
      statusListCredential,
      didKeypair,
    );
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didKeypair - `DID` signing key(s)
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredentialTx(
    statusListCredentialId,
    didKeypair,
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).removeStatusListCredentialTx(
      id,
      didKeypair,
    );
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @param didKeypair
   * @param params
   * @return {Promise<StatusListCredentialId>} - the extrinsic to sign and send.
   */
  async createStatusListCredential(
    statusListCredentialId,
    statusListCredential,
    didKeypair,
    params,
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).createStatusListCredential(
      id,
      statusListCredential,
      didKeypair,
      params,
    );
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param id
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @param params
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredential(
    statusListCredentialId,
    statusListCredential,
    didKeypair,
    params,
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).updateStatusListCredential(
      id,
      statusListCredential,
      didKeypair,
      params,
    );
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @param params
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredential(
    statusListCredentialId,
    didKeypair,
    params,
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).removeStatusListCredential(
      id,
      didKeypair,
      params,
    );
  }
}
