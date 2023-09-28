import { Sr25519SigName, Sr25519VerKeyName } from './constants';
import Sr25519VerificationKey2020 from './Sr25519VerificationKey2020';
import CustomLinkedDataSignature from './common/CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export default class Sr25519Signature2020 extends CustomLinkedDataSignature {
  /**
   * Creates a new Sr25519Signature2020 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod, verifier, signer, useProofValue,
  } = {}) {
    super({
      type: Sr25519SigName,
      LDKeyClass: Sr25519VerificationKey2020,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'EdDSA',
      signer: signer || Sr25519Signature2020.signerFactory(keypair, verificationMethod),
      verifier,
      useProofValue,
    });
    this.requiredKeyType = Sr25519VerKeyName;
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @param verificationMethod
   * @returns {object}
   */
  static signerFactory(keypair, verificationMethod) {
    return {
      id: verificationMethod,
      async sign({ data }) {
        return keypair.sign(data);
      },
    };
  }
}
