import { AbstractBaseModule } from '../common';
import { withExtendedPrototypeProperties } from '../../../utils';

/**
 * Module supporting `StatusList2021Credential` and `RevocationList2020Credential`.
 */
class AbstractStatusListCredentialModule extends AbstractBaseModule {
  /**
   * Fetches `StatusList2021Credential` with the supplied identifier.
   * @param {*} statusListCredentialId
   * @returns {Promise<StatusList2021Credential | null>}
   */
  async getStatusListCredential(_statusListCredentialId) {
    throw new Error('Unimplemented');
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
    id,
    statusListCredential,
    didKeypair,
    params,
  ) {
    return await this.signAndSend(
      await this.createStatusListCredentialTx(
        id,
        statusListCredential,
        didKeypair,
      ),
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
    id,
    statusListCredential,
    didKeypair,
    params,
  ) {
    return await this.signAndSend(
      await this.updateStatusListCredentialTx(
        id,
        statusListCredential,
        didKeypair,
      ),
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
    return await this.signAndSend(
      await this.removeStatusListCredentialTx(
        statusListCredentialId,
        didKeypair,
      ),
      params,
    );
  }

  /**
   * Create a transaction to create a new status list credential on-chain.
   * @param id - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param statusListCredential - the credential to be associated with the given `id`
   * @param didKeypair
   * @return {Promise<*>} - the extrinsic to sign and send.
   */
  async createStatusListCredentialTx(
    _id,
    _statusListCredential,
    _didKeypair,
  ) {
    throw new Error('Unimplemented');
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param id
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @param params
   * @return {Promise<*>} - the extrinsic to sign and send.
   */
  async updateStatusListCredentialTx(
    _id,
    _statusListCredential,
    _didKeypair,
  ) {
    throw new Error('Unimplemented');
  }

  /**
   * Create a transaction to remove an existing status list credential from the chain.
   * @param statusListCredentialId - is the unique id of the status list credential. The function will check whether `id` is already taken or not.
   * @param didKeypair - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async removeStatusListCredentialTx(
    _statusListCredentialId,
    _didKeypair,
  ) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  [
    'getStatusListCredential',
    'createStatusListCredentialTx',
    'updateStatusListCredentialTx',
    'removeStatusListCredentialTx',
  ],
  AbstractStatusListCredentialModule,
);
