import { suites } from 'jsonld-signatures';
import { Ed25519SigName, Ed25519VerKeyName } from './constants';
import Ed25519VerificationKey2018 from './Ed25519VerificationKey2018';
import base58btc from 'base58-universal';

// multibase base58-btc header
const MULTIBASE_BASE58BTC_HEADER = 'z';
const SUITE_CONTEXT_URL = 'https://w3id.org/security/suites/ed25519-2018/v1';

export default class Ed25519Signature2018 extends suites.LinkedDataSignature {
  /**
   * Creates a new Ed25519Signature2018 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod,
  } = {}) {
    super({
      type: Ed25519SigName,
      alg: 'EdDSA',
      LDKeyClass: Ed25519VerificationKey2018,
      contextUrl: SUITE_CONTEXT_URL,
      verificationMethod,
      signer: Ed25519Signature2018.signerFactory(keypair),
    });
    this.requiredKeyType = Ed25519VerKeyName;
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {object}
   */
  static signerFactory(keypair) {
    return {
      async sign({ data }) {
        return keypair.sign(data);
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
