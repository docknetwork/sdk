import { option } from '@docknetwork/credential-sdk/types/generic';
import { DockStatusListCredentialId } from '@docknetwork/credential-sdk/types';
import { AbstractStatusListCredentialModule } from '@docknetwork/credential-sdk/modules/abstract/status-list-credential';
import { DockStatusList2021CredentialWithPolicy } from './types';
import { injectDock } from '../common';
import DockStatusListCredentialInternalModule from './internal';
import { firstSigner } from '../common/keypair';

export default class DockStatusListCredentialModule extends injectDock(
  AbstractStatusListCredentialModule,
) {
  static DockOnly = DockStatusListCredentialInternalModule;

  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async getStatusListCredential(id) {
    return (
      option(DockStatusList2021CredentialWithPolicy).from(
        await this.dockOnly.query.statusListCredentials(DockStatusListCredentialId.from(id).value),
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
    statusListCredentialId,
    statusListCredential,
    didKeypair,
  ) {
    const { did } = firstSigner(didKeypair);

    return await this.dockOnly.tx.create(statusListCredentialId, statusListCredential, did);
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didKeypair - `DID` keypairs to sing the transaction.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredentialTx(
    statusListCredentialId,
    statusListCredential,
    didKeypair,
  ) {
    const { did } = firstSigner(didKeypair);

    return await this.dockOnly.tx.update(
      statusListCredentialId,
      statusListCredential,
      did,
      didKeypair,
    );
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didKeypair - `DID` keypairs to sing the transaction.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredentialTx(
    statusListCredentialId,
    didKeypair,
  ) {
    const { did } = firstSigner(didKeypair);

    return await this.dockOnly.tx.remove(
      statusListCredentialId,
      did,
      didKeypair,
    );
  }
}
