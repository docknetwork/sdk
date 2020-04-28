import { suites } from 'jsonld-signatures';
import { sha256 } from 'js-sha256';
import { EcdsaSecp256k1SigName, EcdsaSecp256k1VerKeyName } from './constants';
import EcdsaSecp256k1VerificationKey2019 from './EcdsaSecp256k1VerificationKey2019';

export default class EcdsaSepc256k1Signature2019 extends suites.JwsLinkedDataSignature {
  /**
   * Creates a new EcdsaSepc256k1Signature2019 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair, verificationMethod,
  } = {}) {
    super({
      type: EcdsaSecp256k1SigName,
      alg: 'ES256K',
      LDKeyClass: EcdsaSecp256k1VerificationKey2019,
      verificationMethod,
      signer: EcdsaSepc256k1Signature2019.signerFactory(keypair),
    });
    this.requiredKeyType = EcdsaSecp256k1VerKeyName;
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {object}
   */
  static signerFactory(keypair) {
    return {
      async sign({ data }) {
        const hash = sha256.digest(data);
        return new Uint8Array(keypair.sign(hash).toDER());
      },
    };
  }
}
