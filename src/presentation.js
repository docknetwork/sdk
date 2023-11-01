import {
  BBSPlusPublicKeyG2,
  initializeWasm,
  isWasmInitialized,
  BBSPublicKey,
  PSPublicKey,
  PresentationBuilder,
} from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import { stringToU8a } from '@polkadot/util';
import { ensureArray } from './utils/type-helpers';

import Bls12381BBSSignatureDock2022 from './utils/vc/crypto/Bls12381BBSSignatureDock2022';
import {
  Bls12381BBSSigDockSigName,
  Bls12381PSSigDockSigName,
  Bls12381BBS23SigDockSigName,
  Bls12381PSSigProofDockSigName,
  Bls12381BBS23SigProofDockSigName,
  Bls12381BBSSigProofDockSigName,
} from './utils/vc/crypto/constants';
import defaultDocumentLoader from './utils/vc/document-loader';
import {
  Bls12381BBSSignatureDock2023,
  Bls12381PSSignatureDock2023,
} from './utils/vc/custom_crypto';

const SIG_NAME_TO_PROOF_NAME = Object.setPrototypeOf(
  {
    [Bls12381BBSSigDockSigName]: Bls12381BBSSigProofDockSigName,
    [Bls12381BBS23SigDockSigName]: Bls12381BBS23SigProofDockSigName,
    [Bls12381PSSigDockSigName]: Bls12381PSSigProofDockSigName,
  },
  null,
);

export default class Presentation {
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
    this.presBuilder.markAttributesRevealed(
      credentialIndex,
      new Set(attributes),
    );
  }

  /**
   * Create a presentation
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
   * Adds a JSON-LD credential to be presented
   * @param credentialLD
   * @param options
   * @returns {Promise<number>}
   */
  async addCredentialToPresent(credentialLD, options = {}) {
    if (options.documentLoader && options.resolver) {
      throw new Error(
        'Passing resolver and documentLoader results in resolver being ignored, please re-factor.',
      );
    }
    if (!isWasmInitialized()) {
      await initializeWasm();
    }

    const documentLoader = options.documentLoader || defaultDocumentLoader(options.resolver);

    const json = typeof credentialLD === 'string'
      ? JSON.parse(credentialLD)
      : credentialLD;

    const { proof } = json;

    if (!proof) {
      throw new Error('Credential does not have a proof');
    }

    let Signature;
    let PublicKey;

    switch (proof.type) {
      case Bls12381BBSSigDockSigName:
        Signature = Bls12381BBSSignatureDock2022;
        PublicKey = BBSPlusPublicKeyG2;
        break;
      case Bls12381BBS23SigDockSigName:
        Signature = Bls12381BBSSignatureDock2023;
        PublicKey = BBSPublicKey;
        break;
      case Bls12381PSSigDockSigName:
        Signature = Bls12381PSSignatureDock2023;
        PublicKey = PSPublicKey;
        break;
      default:
        throw new Error(`Invalid proof type ${proof.type}`);
    }

    const keyDocument = await Signature.getVerificationMethod({
      proof,
      documentLoader,
    });

    const pkRaw = b58.decode(keyDocument.publicKeyBase58);
    const pk = new PublicKey(pkRaw);

    const convertedCredential = Signature.convertCredentialForPresBuilding({ document: json });
    const idx = this.presBuilder.addCredential(convertedCredential, pk);

    // Enforce revealing of verificationMethod and type
    // We also require context and type for JSON-LD
    this.addAttributeToReveal(idx, [
      'proof.type',
      'proof.verificationMethod',
      '@context',
      'type',
    ]);
    return idx;
  }

  deriveCredentials(options) {
    const presentation = this.createPresentation(options);
    const { credentials } = presentation.spec;
    if (credentials.length > 1) {
      throw new Error(
        'Cannot derive from multiple credentials in a presentation',
      );
    }

    return credentials.map((credential) => {
      if (!credential.revealedAttributes.proof) {
        throw new Error('Credential proof is not revealed, it should be');
      }

      const date = new Date().toISOString();
      const type = SIG_NAME_TO_PROOF_NAME[credential.revealedAttributes.proof.type];
      if (type == null) {
        throw new Error(
          `Failed to map credential signature type to the proof type: ${credential.revealedAttributes.proof.type}`,
        );
      }

      return {
        ...credential.revealedAttributes,
        '@context': JSON.parse(credential.revealedAttributes['@context']),
        type: JSON.parse(credential.revealedAttributes.type),
        credentialSchema: JSON.parse(credential.schema),
        issuer:
          credential.revealedAttributes.issuer
          || credential.revealedAttributes.proof.verificationMethod.split('#')[0],
        issuanceDate: credential.revealedAttributes.issuanceDate || date,
        proof: {
          proofPurpose: 'assertionMethod',
          created: date,
          ...credential.revealedAttributes.proof,
          type,
          // Question: Why each cred will have the same proof, nonce, context, etc. They don't apply here. And is the same proof repeatedly verified?
          proofValue: presentation.proof,
          nonce: presentation.nonce,
          context: presentation.context,
          attributeCiphertexts: presentation.attributeCiphertexts,
          attributeEqualities: presentation.spec.attributeEqualities,
          boundedPseudonyms: presentation.spec.boundedPseudonyms,
          unboundedPseudonyms: presentation.spec.unboundedPseudonyms,
          version: credential.version,
          sigType: credential.sigType,
          bounds: credential.bounds,
        },
      };
    });
  }
}
