import { AbstractStatusListCredentialModule } from '@docknetwork/credential-sdk/modules';
import { withCheqd } from '../common';
import CheqdInternalStatusListCredentialModule from './internal';

export default class CheqdStatusListCredentialModule extends withCheqd(
  AbstractStatusListCredentialModule,
) {
  static CheqdOnly = CheqdInternalStatusListCredentialModule;

  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async getStatusListCredential(id) {
    return await this.cheqdOnly.statusListCredential(id);
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @param didKeypair
   * @return {Promise<StatusListCredentialId>} - the extrinsic to sign and send.
   */
  async createStatusListCredentialTx(id, statusListCredential, didKeypair) {
    if ((await this.cheqdOnly.lastStatusListCredentialId(id)) != null) {
      throw new Error(
        `Status List credential with id \`${id}\` already exists`,
      );
    }
    return await this.cheqdOnly.tx.create(id, statusListCredential, didKeypair);
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param id
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredentialTx(id, statusListCredential, didKeypair) {
    return await this.cheqdOnly.tx.update(id, statusListCredential, didKeypair);
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredentialTx(id, didKeypair) {
    return await this.cheqdOnly.tx.remove(id, didKeypair);
  }
}
