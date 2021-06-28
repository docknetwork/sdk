import { suites } from 'jsonld-signatures';
import { Sr25519SigName, Sr25519VerKeyName } from './constants';
import Sr25519VerificationKey2020 from './Sr25519VerificationKey2020';

export default class Sr25519Signature2020 extends suites.LinkedDataSignature {
  /**
   * Creates a new Sr25519Signature2020 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod,
  } = {}) {
    super({
      type: Sr25519SigName,
      alg: 'EdDSA',
      LDKeyClass: Sr25519VerificationKey2020,
      verificationMethod,
      signer: Sr25519Signature2020.signerFactory(keypair),
    });
    this.requiredKeyType = Sr25519VerKeyName;
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
