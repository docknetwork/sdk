import AbstractAttestModule from '@docknetwork/credential-sdk/modules/attest/module';
import { injectCheqd } from '../common';
import CheqdInternalAttestModule from './internal';

export default class CheqdAttestModule extends injectCheqd(
  AbstractAttestModule,
) {
  static CheqdOnly = CheqdInternalAttestModule;

  /**
   * Fetches the DIDs attestations IRI from the chain
   * @param {*} did
   * @return {Promise<Iri | null>} The DID's attestation, if any
   */
  async getAttests(did) {
    const id = await this.cheqdOnly.attestId(did);
    if (id == null) {
      return null;
    }

    return await this.cheqdOnly.attest(did, id);
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param iri
   * @param did
   * @param signingKeyRef
   * @param params
   */
  async setClaimTx(iri, targetDid, didKeypair) {
    return await this.cheqdOnly.tx.setClaim(iri, targetDid, didKeypair);
  }
}
