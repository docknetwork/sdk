import { withExtendedPrototypeProperties } from '../../../utils';
import { AbstractBaseModule } from '../common';

class AbstractAttestModule extends AbstractBaseModule {
  /**
   * Fetches the DIDs attestations IRI from the chain
   * @param {*} did - DID
   * @return {Promise<TypedBytes | null>} The DID's attestation
   */
  async getAttests(_did) {
    throw new Error('Unimplemented');
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param iri
   * @param signerDid
   * @param didKeypair
   * @param params
   */
  async setClaim(iri, targetDid, didKeypair, params) {
    return await this.signAndSend(
      await this.setClaimTx(iri, targetDid, didKeypair),
      params,
    );
  }

  /**
   * Creates an attestation claim on chain for a specific DID
   * @param iri
   * @param targetDid
   * @param didKeypair
   */
  async setClaimTx(_iri, _targetDid, _didKeypair) {
    throw new Error('Unimplemented');
  }
}

export default withExtendedPrototypeProperties(
  ['getAttests', 'setClaimTx'],
  AbstractAttestModule,
);
