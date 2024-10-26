import { AbstractAttestModule } from '../abstract';
import { NamespaceDid } from '../../types';
import { injectDispatch } from './common';

export default class MultiApiAttestModule extends injectDispatch(
  AbstractAttestModule,
) {
  /**
   * Fetches the DIDs attestations IRI from the chain
   * @param {*} did - DID
   * @return {Promise<TypedBytes | null>} The DID's attestation
   */
  async getAttests(did) {
    const parsedDid = NamespaceDid.from(did);

    return await this.moduleById(parsedDid).getAttests(parsedDid);
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param iri
   * @param signerDid
   * @param didKeypair
   * @param params
   */
  async setClaim(iri, targetDid, didKeypair, params) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).setClaim(iri, did, didKeypair, params);
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param iri
   * @param targetDid
   * @param didKeypair
   */
  async setClaimTx(iri, targetDid, didKeypair) {
    const did = NamespaceDid.from(targetDid);

    return await this.moduleById(did).setClaimTx(iri, did, didKeypair);
  }
}
