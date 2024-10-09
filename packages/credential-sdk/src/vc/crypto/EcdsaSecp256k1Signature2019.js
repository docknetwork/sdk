import { EcdsaSecp256k1SigName, EcdsaSecp256k1VerKeyName } from './constants';
import EcdsaSecp256k1VerificationKey2019 from './EcdsaSecp256k1VerificationKey2019';
import CustomLinkedDataSignature from './common/CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export default class EcdsaSecp256k1Signature2019 extends CustomLinkedDataSignature {
  /**
   * Creates a new EcdsaSecp256k1Signature2019 instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor({
    keypair,
    verificationMethod,
    verifier,
    signer,
    useProofValue,
  } = {}) {
    super({
      type: EcdsaSecp256k1SigName,
      LDKeyClass: EcdsaSecp256k1VerificationKey2019,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'ES256K',
      signer:
        signer
        || EcdsaSecp256k1Signature2019.signerFactory(keypair, verificationMethod),
      verifier,
      useProofValue,
    });
    this.requiredKeyType = EcdsaSecp256k1VerKeyName;
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
        return new Uint8Array(
          keypair.keyPair.sign(keypair.constructor.hash(data)).toDER(),
        );
      },
    };
  }
}
