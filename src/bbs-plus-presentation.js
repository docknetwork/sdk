import { BBSPlusPublicKeyG2, initializeWasm } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import {
  PresentationBuilder,
  Credential,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import { ensureArray } from './utils/type-helpers';

import Bls12381BBSSignatureDock2022 from './utils/vc/crypto/Bls12381BBSSignatureDock2022';
import CustomLinkedDataSignature from './utils/vc/crypto/custom-linkeddatasignature';

export default class BbsPlusPresentation {
  /**
   * Create a new BbsPlusPresentation instance.
   * @constructor
   */
  constructor() {
    this.presBuilder = new PresentationBuilder();
  }

  /**
   * Species attributes to be revealed in the credential
   * @param {number} credentialIndex
   * @param {Array.<string>} attributes
   */
  addAttributeToReveal(credentialIndex, attributes = []) {
    ensureArray(attributes);
    this.presBuilder.markAttributesRevealed(credentialIndex, new Set(attributes));
  }

  /**
   * Create bbs presentation
   * @param options
   * @returns {object}
   */
  createPresentation(options = {}) {
    const { nonce } = options;
    if (nonce && typeof nonce === 'string') {
      this.presBuilder.nonce = b58.decode(nonce);
    }
    const pres = this.presBuilder.finalize();
    return pres.toJSON();
  }

  /**
   * Adds a BBS+ JSON-LD credential to be presented
   * @param credentialLD
   * @param publicKey
   * @returns {Promise<number>}
   */
  async addCredentialToPresent(credentialLD, publicKey) {
    await initializeWasm();
    const json = typeof credentialLD === 'string' ? JSON.parse(credentialLD) : credentialLD;

    const pkRaw = b58.decode(publicKey);
    const pk = new BBSPlusPublicKeyG2(pkRaw);

    const [credential] = Bls12381BBSSignatureDock2022.convertCredential({
      document: json,
    });

    const idx = await this.presBuilder.addCredential(Credential.fromJSON(credential, CustomLinkedDataSignature.fromJsigProofValue(credentialLD.proof.proofValue)), pk);

    // Enforce revealing of verificationMethod and type
    await this.addAttributeToReveal(idx, ['proof.type']);
    await this.addAttributeToReveal(idx, ['proof.verificationMethod']);
    return idx;
  }
}