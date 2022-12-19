import { BBSPlusPublicKeyG2, initializeWasm, isWasmInitialized } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import { stringToU8a } from '@polkadot/util';
import {
  PresentationBuilder,
  Credential,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';
import { ensureArray } from './utils/type-helpers';

import Bls12381BBSSignatureDock2022 from './utils/vc/crypto/Bls12381BBSSignatureDock2022';
import { Bls12381BBSSigProofDockSigName } from './utils/vc/crypto/constants';
import CustomLinkedDataSignature from './utils/vc/crypto/custom-linkeddatasignature';
import defaultDocumentLoader from './utils/vc/document-loader';

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
    const { nonce, context } = options;
    if (nonce) {
      this.presBuilder.nonce = stringToU8a(nonce);
    }
    if (context) {
      this.presBuilder.context = context;
    }
    const pres = this.presBuilder.finalize();
    return pres.toJSON();
  }

  /**
   * Adds a BBS+ JSON-LD credential to be presented
   * @param credentialLD
   * @param options
   * @returns {Promise<number>}
   */
  async addCredentialToPresent(credentialLD, options = {}) {
    if (options.documentLoader && options.resolver) {
      throw new Error('Passing resolver and documentLoader results in resolver being ignored, please re-factor.');
    }
    if (!isWasmInitialized()) {
      await initializeWasm();
    }
    const documentLoader = options.documentLoader || defaultDocumentLoader(options.resolver);

    const json = typeof credentialLD === 'string' ? JSON.parse(credentialLD) : credentialLD;

    const { proof } = json;

    if (!proof) {
      throw new Error('BBS credential does not have a proof');
    }
    const keyDocument = await Bls12381BBSSignatureDock2022.getVerificationMethod({
      proof,
      documentLoader,
    });

    const pkRaw = b58.decode(keyDocument.publicKeyBase58);
    const pk = new BBSPlusPublicKeyG2(pkRaw);

    const [credential] = Bls12381BBSSignatureDock2022.convertCredential({
      document: json,
    });

    const convertedCredential = Credential.fromJSON(credential, CustomLinkedDataSignature.fromJsigProofValue(credentialLD.proof.proofValue));
    console.log('convertedCredential', convertedCredential.toJSON());
    const idx = await this.presBuilder.addCredential(convertedCredential, pk);

    // Enforce revealing of verificationMethod and type
    this.addAttributeToReveal(idx, ['proof.type']);
    this.addAttributeToReveal(idx, ['proof.verificationMethod']);

    // We also require context and type for JSON-LD
    this.addAttributeToReveal(idx, ['@context']);
    this.addAttributeToReveal(idx, ['type']);
    return idx;
  }

  deriveCredentials(options) {
    const presentation = this.createPresentation(options);
    const { credentials } = presentation.spec;
    if (credentials.length > 1) {
      throw new Error('Cannot derive from multiple credentials in a presentation');
    }

    return credentials.map((credential) => {
      if (!credential.revealedAttributes.proof) {
        throw new Error('Credential proof is not revealed, it should be');
      }

      const date = new Date().toISOString();

      return {
        ...credential.revealedAttributes,
        '@context': JSON.parse(credential.revealedAttributes['@context']),
        type: JSON.parse(credential.revealedAttributes.type),
        credentialSchema: JSON.parse(credential.schema),
        issuer: credential.revealedAttributes.issuer || credential.revealedAttributes.proof.verificationMethod.split('#')[0],
        issuanceDate: credential.revealedAttributes.issuanceDate || date,
        proof: {
          proofPurpose: 'assertionMethod',
          created: date,
          ...credential.revealedAttributes.proof,
          type: Bls12381BBSSigProofDockSigName,
          proofValue: presentation.proof,
          nonce: presentation.nonce,
          context: presentation.context,
          attributeCiphertexts: presentation.attributeCiphertexts,
          attributeEqualities: presentation.spec.attributeEqualities,
          version: credential.version,
        },
      };
    });
  }
}
