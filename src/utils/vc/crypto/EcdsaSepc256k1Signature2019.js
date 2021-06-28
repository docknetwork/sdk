import jsigs, { suites } from 'jsonld-signatures';
import { sha256 } from 'js-sha256';
import { EcdsaSecp256k1SigName, EcdsaSecp256k1VerKeyName } from './constants';
import EcdsaSecp256k1VerificationKey2019 from './EcdsaSecp256k1VerificationKey2019';
import base58btc from 'base58-universal';

const SUITE_CONTEXT_URL = 'https://w3id.org/security/v2'; // TODO: not right?

export default class EcdsaSepc256k1Signature2019 extends suites.LinkedDataSignature {
  /**
   * Creates a new EcdsaSepc256k1Signature2019 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod,
  } = {}) {


    // super({
    //   type: 'Ed25519Signature2020', LDKeyClass: Ed25519VerificationKey2020,
    //   contextUrl: SUITE_CONTEXT_URL,
    //   key, signer, verifier, proof, date, useNativeCanonize
    // });

    const signer = EcdsaSepc256k1Signature2019.signerFactory(keypair, verificationMethod);
    console.log('signer', signer)

    super({
      type: EcdsaSecp256k1SigName,
      LDKeyClass: EcdsaSecp256k1VerificationKey2019,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'ES256K',
      signer: EcdsaSepc256k1Signature2019.signerFactory(keypair, verificationMethod),
    });
    console.log('EcdsaSepc256k1Signature2019', this)
    this.requiredKeyType = EcdsaSecp256k1VerKeyName;
  }

  async createVerifyData({document, proof, documentLoader, expansionMap}) {
    console.log('document', document)
    await super.createVerifyData({document, proof, documentLoader, expansionMap});
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {object}
   */
  static signerFactory(keypair, verificationMethod) {
    return {
      id: verificationMethod,
      async sign({ data }) {
        const hash = sha256.digest(data);
        return new Uint8Array(keypair.sign(hash).toDER());
      },
    };
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
  async sign({verifyData, proof}) {
    if(!(this.signer && typeof this.signer.sign === 'function')) {
      throw new Error('A signer API has not been specified.');
    }

    const signatureBytes = await this.signer.sign({data: verifyData});
    proof.proofValue =
      MULTIBASE_BASE58BTC_HEADER + base58btc.encode(signatureBytes);

    return proof;
  }
}
