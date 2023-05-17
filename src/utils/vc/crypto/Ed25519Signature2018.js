import { Ed25519SigName, Ed25519VerKeyName } from './constants';
import Ed25519VerificationKey2018 from './Ed25519VerificationKey2018';
import CustomLinkedDataSignature from './common/CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export default class Ed25519Signature2018 extends CustomLinkedDataSignature {
  /**
   * Creates a new Ed25519Signature2018 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod, verifier, signer,
  } = {}) {
    super({
      type: Ed25519SigName,
      LDKeyClass: Ed25519VerificationKey2018,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'EdDSA',
      signer: signer || Ed25519Signature2018.signerFactory(keypair, verificationMethod),
      verifier,
    });
    this.requiredKeyType = Ed25519VerKeyName;
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
