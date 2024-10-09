import { Ed255192020SigName, Ed255192020VerKeyName } from './constants';
import Ed25519VerificationKey2020 from './Ed25519VerificationKey2020';
import CustomLinkedDataSignature from './common/CustomLinkedDataSignature';
import { valueBytes } from '../../utils/bytes';

const SUITE_CONTEXT_URL = 'https://w3id.org/security/suites/ed25519-2020/v1';

export default class Ed25519Signature2020 extends CustomLinkedDataSignature {
  /**
   * Creates a new Ed25519Signature2020 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod, verifier, signer,
  } = {}) {
    super({
      type: Ed255192020SigName,
      LDKeyClass: Ed25519VerificationKey2020,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'EdDSA',
      signer:
        signer
        || Ed25519Signature2020.signerFactory(keypair, verificationMethod),
      verifier,
    });
    this.requiredKeyType = Ed255192020VerKeyName;
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
        return valueBytes(keypair.sign(data));
      },
    };
  }
}
