import AbstractAttestModule from '@docknetwork/credential-sdk/modules/attest/module';
import { ensureTargetKeypair, injectDock } from '../common';
import DockInternalAttestModule from './internal';

export default class DockAttestModule extends injectDock(AbstractAttestModule) {
  static DockOnly = DockInternalAttestModule;

  /**
   * Fetches the DIDs attestations IRI from the chain
   * @param {*} did
   * @return {Promise<Iri | null>} The DID's attestation, if any
   */
  async getAttests(did) {
    return (await this.dockOnly.attest(did)).iri;
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param iri
   * @param did
   * @param signingKeyRef
   */
  async setClaimTx(iri, targetDid, didKeypair) {
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
