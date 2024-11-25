import { AbstractStatusListCredentialModule } from '@docknetwork/credential-sdk/modules';
import { CheqdStatusListCredentialId } from '@docknetwork/credential-sdk/types';
import { injectCheqd } from '../common';
import CheqdInternalStatusListCredentialModule from './internal';
import { OwnerWithStatusListCredential } from './types';

export default class CheqdStatusListCredentialModule extends injectCheqd(AbstractStatusListCredentialModule) {
  static CheqdOnly = CheqdInternalStatusListCredentialModule;

  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async getStatusListCredential(statusListCredentialId) {
    throw new Error('Unimplemented');
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @param targetDid
   * @param didKeypair
   * @param params
   * @return {Promise<StatusListCredentialId>} - the extrinsic to sign and send.
   */
  async createStatusListCredentialTx(
    id,
    statusListCredential,
    targetDid,
    didKeypair,
  ) {
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param id
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param targetDid
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @param params
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredential(
    id,
    statusListCredential,
    targetDid,
    didKeypair,
  ) {
    await this.updateStatusListCredentialTx(
      id,
      statusListCredential,
      targetDid,
      didKeypair,
    );
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param targetDid
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @param params
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredential(
    statusListCredentialId,
    targetDid,
    didKeypair,
  ) {
    await this.removeStatusListCredentialTx(
      statusListCredentialId,
      targetDid,
      didKeypair,
    )
  }
}
