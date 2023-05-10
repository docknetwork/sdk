import {
  PSPublicKey,
} from '@docknetwork/crypto-wasm-ts';
import { PSPresentation } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials/presentation';
import b58 from 'bs58';

import Bls12381PSSignatureDock2023 from './Bls12381PSSignatureDock2023';
import { Bls12381PSSigDockSigName, Bls12381PSSigProofDockSigName } from './constants';

import Bls12381PSKeyPairDock2022 from './Bls12381PSKeyPairDock2023';
import CustomLinkedDataSignature from './custom-linkeddatasignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

/*
 * Converts a derived PS+ proof credential to the native presentation format
 */
export function convertToPresentation(document) {
  const {
    '@context': context,
    type,
    credentialSchema,
    issuer,
    issuanceDate,
    proof,
    ...revealedAttributes
  } = document;

  return {
    version: '0.0.1',
    nonce: proof.nonce,
    context: proof.context,
    spec: {
      credentials: [
        {
          version: proof.version,
          schema: JSON.stringify(credentialSchema),
          revealedAttributes: {
            proof: {
              type: Bls12381PSSigDockSigName,
              verificationMethod: proof.verificationMethod,
            },
            '@context': JSON.stringify(context),
            type: JSON.stringify(type),
            ...revealedAttributes,
          },
        },
      ],
      attributeEqualities: proof.attributeEqualities,
    },
    attributeCiphertexts: proof.attributeCiphertexts,
    proof: proof.proofValue,
  };
}

/**
 * A PS+ signature suite for use with derived PS+ credentials aka PS+ presentations
 */
export default class Bls12381PSSignatureProofDock2022 extends CustomLinkedDataSignature {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    const {
      verificationMethod,
    } = options;

    super({
      type: Bls12381PSSigProofDockSigName,
      LDKeyClass: Bls12381PSKeyPairDock2022,
      contextUrl: SUITE_CONTEXT_URL,
      alg: Bls12381PSSigProofDockSigName,
      useProofValue: true,
    });

    this.proof = {
      '@context': [
        {
          sec: 'https://w3id.org/security#',
          proof: {
            '@id': 'sec:proof',
            '@type': '@id',
            '@container': '@graph',
          },
        },
        'https://ld.dock.io/security/ps/v1',
      ],
      type: Bls12381PSSigProofDockSigName,
    };

    this.verificationMethod = verificationMethod;
  }

  async verifyProof({
    proof, document, documentLoader, expansionMap,
  }) {
    try {
      const verificationMethod = await this.getVerificationMethod(
        {
          proof, document, documentLoader, expansionMap,
        },
      );

      const presentationJSON = convertToPresentation({ ...document, proof });
      const recreatedPres = PSPresentation.fromJSON(presentationJSON);

      const pks = [verificationMethod].map((keyDocument) => {
        const pkRaw = b58.decode(keyDocument.publicKeyBase58);
        return new PSPublicKey(pkRaw);
      });

      if (!recreatedPres.verify(pks)) {
        throw new Error('Invalid signature');
      }

      return { verified: true, verificationMethod };
    } catch (error) {
      return { verified: false, error };
    }
  }

  /**
   * @param document {object} to be signed.
   * @param proof {object}
   * @param documentLoader {function}
   * @param expansionMap {function}
   */
  async getVerificationMethod({ proof, documentLoader }) {
    return Bls12381PSSignatureDock2023.getVerificationMethod({ proof, documentLoader });
  }

  ensureSuiteContext() {
    // no-op
  }
}

Bls12381PSSignatureProofDock2022.proofType = [
  Bls12381PSSigProofDockSigName,
  `sec:${Bls12381PSSigProofDockSigName}`,
  `https://w3id.org/security#${Bls12381PSSigProofDockSigName}`,
];
