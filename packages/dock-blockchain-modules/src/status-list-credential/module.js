import { option } from '@docknetwork/credential-sdk/types/generic';
import { AbstractStatusListCredentialModule } from '@docknetwork/credential-sdk/modules/abstract/status-list-credential';
import { DockStatusList2021CredentialWithPolicy } from './types';
import { injectDock } from '../common';
import DockStatusListCredentialInternalModule from './internal';

export default class DockStatusListCredentialModule extends injectDock(
  AbstractStatusListCredentialModule,
) {
  static DockOnly = DockStatusListCredentialInternalModule;

  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async getStatusListCredential(statusListCredentialId) {
    return (
      option(DockStatusList2021CredentialWithPolicy).from(
        await this.dockOnly.query.statusListCredentials(statusListCredentialId),
      )?.statusListCredential?.value?.list ?? null
    );
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async createStatusListCredentialTx(
    id,
    statusListCredential,
    signerDid,
    _didKeypair,
  ) {
    return await this.dockOnly.tx.create(id, statusListCredential, signerDid);
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredentialTx(
    id,
    statusListCredential,
    targetDid,
    didKeypair,
  ) {
    return await this.dockOnly.tx.update(
      id,
      statusListCredential,
      targetDid,
      didKeypair,
    );
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredentialTx(
    statusListCredentialId,
    targetDid,
    didKeypair,
  ) {
    return await this.dockOnly.tx.remove(
      statusListCredentialId,
      targetDid,
      didKeypair,
    );
  }
}
