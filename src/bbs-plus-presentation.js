import { BBSPlusPublicKeyG2 } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import {
  PresentationBuilder,
  Credential,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import { ensureArray, ensureURI, isObject } from './utils/type-helpers';

import Bls12381BBSSignatureDock2022 from './utils/vc/crypto/Bls12381BBSSignatureDock2022';
import CustomLinkedDataSignature from './utils/vc/crypto/custom-linkeddatasignature';

const DEFAULT_CONTEXT = 'https://ld.dock.io/security/bbs/v1';
export default class BbsPlusPresentation {
  /**
   * Create a new BbsPlusPresentation instance.
   * @constructor
   */
  constructor() {
    this.presBuilder = new PresentationBuilder();
    this.setPresentationContext([DEFAULT_CONTEXT]);
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
    const { nonce, context } = options;
    if (nonce) {
      this.presBuilder.nonce = stringToU8a(nonce);
    }
    if (context) {
      this.setPresentationContext(context);
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
    // TODO: pass documentLoader/resolver options instead of PK
    const json = typeof credentialLD === 'string' ? JSON.parse(credentialLD) : credentialLD;

    const pkRaw = b58.decode(publicKey);
    const pk = new BBSPlusPublicKeyG2(pkRaw);

    const [credential] = Bls12381BBSSignatureDock2022.convertCredential({
      document: json,
    });

    const idx = await this.presBuilder.addCredential(Credential.fromJSON(credential, CustomLinkedDataSignature.fromJsigProofValue(credentialLD.proof.proofValue)), pk);

    // Enforce revealing of verificationMethod and type
    this.addAttributeToReveal(idx, ['proof.type']);
    this.addAttributeToReveal(idx, ['proof.verificationMethod']);
    return idx;
  }

  /**
   *
   * @param context
   */
  setPresentationContext(context) {
    if (!isObject(context) && !Array.isArray(context)) {
      ensureURI(context);
    }
    this.presBuilder.context = context;
  }
}
