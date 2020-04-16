import { suites } from 'jsonld-signatures';
import { Ed25519SigName, Ed25519VerKeyName } from './constants';
import Ed25519VerificationKey2018 from './Ed25519VerificationKey2018';

export default class Ed25519Signature2018 extends suites.JwsLinkedDataSignature {
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
   * @returns {Promise<sign>}
   */
  static signerFactory(keypair) {
    return {
      async sign({ data }) {
        return keypair.sign(data);
      },
    };
  }
}
