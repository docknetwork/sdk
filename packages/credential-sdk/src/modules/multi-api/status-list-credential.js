import { AbstractStatusListCredentialModule } from "../abstract";
import { StatusListCredentialId } from "../../types";
import { injectDispatch } from "./common";

export default class MultiApiStatusListCredentialModule extends injectDispatch(
  AbstractStatusListCredentialModule
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
    signerDid,
    didKeypair
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).createStatusListCredentialTx(
      id,
      statusListCredential,
      signerDid,
      didKeypair
    );
  }

  /**
   * Create a transaction to update an existing status list credential on-chain.
   * @param statusListCredentialUpdate - Update for the status list credential.
   * @param didSigs - `DID` signatures over an action with a nonce authorizing this action according to the existing policy.
   * @return {Promise<object>} - the extrinsic to sign and send.
   */
  async updateStatusListCredentialTx(
    statusListCredentialId,
    statusListCredential,
    targetDid,
    didKeypair
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).updateStatusListCredentialTx(
      id,
      statusListCredential,
      targetDid,
      didKeypair
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
    didKeypair
  ) {
    const id = StatusListCredentialId.from(statusListCredentialId);

    return await this.moduleById(id).removeStatusListCredentialTx(
      id,
      targetDid,
      didKeypair
    );
  }
}
