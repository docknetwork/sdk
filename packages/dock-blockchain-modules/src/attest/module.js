import AbstractAttestModule from '@docknetwork/credential-sdk/modules/attest/module';
import { ensureTargetKeypair, injectDock } from '../common';
import DockInternalAttestModule from './internal';

export default class DockAttestModule extends injectDock(AbstractAttestModule) {
  static DockOnly = DockInternalAttestModule;

  /**
   * Fetches the DIDs attestations IRI from the chain
   * @param {string} hexId - DID in hex format
   * @return {Promise<string | null>} The DID's attestation, if any
   */
  async getAttests(did) {
    return (await this.dockOnly.attest(did)).iri?.value;
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param priority
   * @param iri
   * @param did
   * @param signingKeyRef
   * @param params
   */
  async setClaimTx(iri, targetDid, didKeypair) {
    console.log(iri, targetDid, didKeypair);
    ensureTargetKeypair(targetDid, didKeypair);
    const currentPriority = (await this.dockOnly.attest(targetDid)).priority?.value ?? 0;

    return await this.dockOnly.tx.setClaim(
      1 + currentPriority,
      iri,
      targetDid,
      didKeypair,
    );
  }
}
