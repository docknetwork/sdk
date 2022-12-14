import { BBSPlusPublicKeyG2, initializeWasm } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import {
  PresentationBuilder,
  Credential,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import { Presentation } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials/presentation';
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
   * Creates a presentation from the added credentials
   * @returns {object}
   */
  createPresentation() {
    const pres = this.presBuilder.finalize();
    return pres.toJSON();
  }

  /**
   * Add jsonld credentials to be presented.
   * @param credentialLD
   * @param publicKey
   * @returns {Promise<number>}
   */
  async addCredentialsToPresent(credentialLD, publicKey) {
    await initializeWasm();
    const json = typeof credentialLD === 'string' ? JSON.parse(credentialLD) : credentialLD;

    const pkRaw = b58.decode(publicKey);
    const pk = new BBSPlusPublicKeyG2(pkRaw);

    const [credential] = await Bls12381BBSSignatureDock2022.convertCredential({
      document: json,
    });

    return this.presBuilder.addCredential(Credential.fromJSON(credential, CustomLinkedDataSignature.fromJsigProofValue(credentialLD.proof.proofValue)), pk);
  }

  /**
   *
   * @param presentationLD
   * @param {Array.<string>} publicKeys
   * @returns {boolean}
   */
  verifyPresentation(presentationLD, publicKeys) {
    ensureArray(publicKeys);

    const recreatedPres = Presentation.fromJSON(presentationLD);

    const pks = publicKeys.map((publicKey) => {
      const pkRaw = b58.decode(publicKey);
      return new BBSPlusPublicKeyG2(pkRaw);
    });

    const result = recreatedPres.verify(pks);
    const { verified } = result;
    return verified;
  }
}
