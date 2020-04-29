import { suites } from 'jsonld-signatures';
import { Ed25519SigName, Ed25519VerKeyName } from './constants';
import Ed25519VerificationKey2018 from './Ed25519VerificationKey2018';

export default class Ed25519Signature2018 extends suites.JwsLinkedDataSignature {
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
}
