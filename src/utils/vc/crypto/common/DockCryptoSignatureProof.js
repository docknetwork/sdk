import { Presentation } from '@docknetwork/crypto-wasm-ts';
import b58 from 'bs58';
import { withExtendedStaticProperties } from '../../../inheritance';

import CustomLinkedDataSignature from './CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export const DOCK_ANON_CREDENTIAL_ID = 'dock:anonymous:credential';

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

        const presentationJSON = this.constructor.derivedToAnoncredsPresentation({
          ...document,
          proof,
        });
        const recreatedPres = Presentation.fromJSON(presentationJSON);

        // NOTE: Another example that this credential derivation doesn't work for presentation with more than 1 credential
        const pks = verificationMethod !== undefined ? [verificationMethod].map((keyDocument) => {
          const pkRaw = b58.decode(keyDocument.publicKeyBase58);
          return new this.constructor.Signature.KeyPair.PublicKey(pkRaw);
        }) : [];

        const {
          accumulatorPublicKeys, predicateParams,
          circomOutputs, blindedAttributesCircomOutputs,
        } = this;

        const res = recreatedPres.verify(pks, accumulatorPublicKeys, predicateParams, circomOutputs, blindedAttributesCircomOutputs);
        if (!res.verified) {
          throw new Error(`Invalid anoncreds presentation due to error: ${res.error}`);
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
    static derivedToAnoncredsPresentation(document) {
      const {
        '@context': context,
        type,
        credentialSchema,
        credentialStatus,
        issuanceDate: _issuanceDate,
        proof,
        ...revealedAttributes
      } = document;

      // ID wasnt revealed but placeholder was used to conform to W3C spec, trim it
      if (revealedAttributes.id === DOCK_ANON_CREDENTIAL_ID) {
        delete revealedAttributes.id;
      }

      // TODO: This is wrong. This won't work with presentation from 2 or more credentials
      const c = {
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
      };
      if (credentialStatus !== undefined) {
        c.status = credentialStatus;
      }
      return {
        version: proof.presVersion,
        nonce: proof.nonce,
        context: proof.context,
        spec: {
          credentials: [
            c,
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
