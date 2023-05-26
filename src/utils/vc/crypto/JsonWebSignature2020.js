import { JsonWebKey } from '@transmute/json-web-signature';
import CustomLinkedDataSignature from './common/CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://w3id.org/security/suites/jws-2020/v1';

export default class JsonWebSignature2020 extends CustomLinkedDataSignature {
  /**
   * Creates a new JsonWebSignature2020 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor(options = {}) {
    const {
      keypair, verifier, signer, useProofValue, verificationMethod,
    } = options;

    super({
      type: 'JsonWebSignature2020',
      LDKeyClass: JsonWebKey,
      contextUrl: SUITE_CONTEXT_URL,
      signer: signer || (keypair && keypair.privateKey && keypair.signer()),
      // alg: keypair && keypair.publicKey && keypair.publicKey.algorithm.name,
      verifier: verifier || (keypair && keypair.verifier()),
      useProofValue,
    });

    this.requiredKeyType = 'JsonWebKey2020';
    this.verificationMethod = verificationMethod || (keypair && keypair.id);
  }

  /**
   * Adds a signature (proofValue) field to the proof object. Called by
   * LinkedDataSignature.createProof().
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.verifyData - Data to be signed (extracted
   *   from document, according to the suite's spec).
   * @param {object} options.proof - Proof object (containing the proofPurpose,
   *   verificationMethod, etc).
   *
   * @returns {Promise<object>} Resolves with the proof containing the signature
   *   value.
   */
  async sign({ verifyData, proof }) {
    const finalProof = { ...proof };
    finalProof.jws = await this.signer.sign({ data: verifyData, detached: true });
    return finalProof;
  }

  /**
   * Verifies the proof signature against the given data.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.verifyData - Canonicalized hashed data.
   * @param {object} options.verificationMethod - Key object.
   * @param {object} options.proof - The proof to be verified.
   *
   * @returns {Promise<boolean>} Resolves with the verification result.
   */
  async verifySignature({ verifyData, verificationMethod, proof }) {
    const data = verifyData;
    let { verifier } = this;
    if (!verifier) {
      const key = await this.LDKeyClass.from(verificationMethod);
      verifier = key.verifier();
    }
    return verifier.verify({ data, signature: proof.jws });
  }

  /**
   * @param document {object} to be signed.
   * @param proof {object}
   * @param documentLoader {function}
   */
  async getVerificationMethod({ proof, documentLoader }) {
    let { verificationMethod } = proof;

    if (typeof verificationMethod === 'object') {
      verificationMethod = verificationMethod.id;
    }

    if (!verificationMethod) {
      throw new Error('No "verificationMethod" found in proof.');
    }

    const { document } = await documentLoader(verificationMethod);

    if (!document) {
      throw new Error(`Verification method ${verificationMethod} not found.`);
    }

    // ensure verification method has not been revoked
    if (document.revoked !== undefined) {
      throw new Error('The verification method has been revoked.');
    }

    return document;
  }
}
