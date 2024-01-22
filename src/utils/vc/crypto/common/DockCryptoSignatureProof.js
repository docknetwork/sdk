import { Presentation } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import { withExtendedStaticProperties } from '../../../inheritance';

import CustomLinkedDataSignature from './CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

/**
 * Defines commons for the `@docknetwork/crypto-wasm-ts` signature proofs.
 */
export default withExtendedStaticProperties(
  ['Signature', 'proofType', 'sigName'],
  class DockCryptoSignatureProof extends CustomLinkedDataSignature {
    /**
     * Default constructor
     * @param options {SignatureSuiteOptions} options for constructing the signature suite
     * @param type
     * @param LDKeyClass
     * @param link
     */
    constructor(options = {}, type, LDKeyClass, link) {
      const { verificationMethod } = options;

      super({
        type,
        LDKeyClass,
        contextUrl: SUITE_CONTEXT_URL,
        alg: type,
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
          link,
        ],
        type,
      };

      this.verificationMethod = verificationMethod;
      this.accumulatorPublicKeys = options.accumulatorPublicKeys;
      this.predicateParams = options.predicateParams;
      this.circomOutputs = options.circomOutputs;
      this.blindedAttributesCircomOutputs = options.blindedAttributesCircomOutputs;
    }

    async verifyProof({
      proof, document, documentLoader, expansionMap,
    }) {
      try {
        const verificationMethod = await this.getVerificationMethod({
          proof,
          document,
          documentLoader,
          expansionMap,
        });

        const presentationJSON = this.constructor.convertToPresentation({
          ...document,
          proof,
        });
        const recreatedPres = Presentation.fromJSON(presentationJSON);

        const pks = [verificationMethod].map((keyDocument) => {
          const pkRaw = b58.decode(keyDocument.publicKeyBase58);
          return new this.constructor.Signature.KeyPair.PublicKey(pkRaw);
        });

        const {
          accumulatorPublicKeys, predicateParams,
          circomOutputs, blindedAttributesCircomOutputs,
        } = this;

        if (!recreatedPres.verify(pks, accumulatorPublicKeys, predicateParams, circomOutputs, blindedAttributesCircomOutputs)) {
          throw new Error('Invalid signature');
        }

        return { verified: true, verificationMethod };
      } catch (error) {
        return { verified: false, error };
      }
    }

    /**
     * Converts a derived proof credential to the native presentation format
     * @param document
     */
    static convertToPresentation(document) {
      const {
        '@context': context,
        type,
        credentialSchema,
        issuer: _issuer,
        issuanceDate: _issuanceDate,
        proof,
        ...revealedAttributes
      } = document;

      return {
        version: proof.version,
        nonce: proof.nonce,
        context: proof.context,
        spec: {
          credentials: [
            {
              sigType: proof.sigType,
              version: proof.version,
              bounds: proof.bounds,
              schema: JSON.stringify(credentialSchema),
              revealedAttributes: {
                proof: {
                  type: this.sigName,
                  verificationMethod: proof.verificationMethod,
                },
                '@context': JSON.stringify(context),
                type: JSON.stringify(type),
                ...revealedAttributes,
              },
            },
          ],
          attributeEqualities: proof.attributeEqualities,
          boundedPseudonyms: proof.boundedPseudonyms,
          unboundedPseudonyms: proof.unboundedPseudonyms,
        },
        attributeCiphertexts: proof.attributeCiphertexts,
        proof: proof.proofValue,
      };
    }

    /**
     * @param document {object} to be signed.
     * @param proof {object}
     * @param documentLoader {function}
     * @param expansionMap {function}
     */
    async getVerificationMethod({ proof, documentLoader }) {
      return this.constructor.Signature.getVerificationMethod({
        proof,
        documentLoader,
      });
    }
  },
);
