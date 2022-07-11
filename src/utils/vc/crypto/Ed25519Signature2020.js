import { Ed2551920SigName, Ed2551920VerKeyName } from './constants';
import Ed25519VerificationKey2020 from './Ed25519VerificationKey2020';
import CustomLinkedDataSignature from './custom-linkeddatasignature';
import * as jsig from '@digitalbazaar/ed25519-signature-2020';
// const jsig = require('@digitalbazaar/ed25519-signature-2020');

const SUITE_CONTEXT_URL = 'https://w3id.org/security/suites/ed25519-2020/v1';

export default class Ed25519Signature2020 extends jsig.Ed25519Signature2020 {
  /**
   * Creates a new Ed25519Signature2020 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod, verifier, signer,
  } = {}) {
    /*super({
      type: Ed2551920SigName,
      LDKeyClass: Ed25519VerificationKey2020,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'EdDSA',
      signer: signer || Ed25519Signature2020.signerFactory(keypair, verificationMethod),
      verifier,
    });
    this.requiredKeyType = Ed2551920VerKeyName;*/
    super({signer: signer || Ed25519Signature2020.signerFactory(keypair, verificationMethod)})
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
        return keypair.sign(data);
      },
    };
  }
}
