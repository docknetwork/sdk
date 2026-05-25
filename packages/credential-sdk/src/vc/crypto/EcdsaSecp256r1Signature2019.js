import { EcdsaSecp256r1SigName, EcdsaSecp256r1VerKeyName } from './constants';
import EcdsaSecp256r1VerificationKey2019 from './EcdsaSecp256r1VerificationKey2019';
import CustomLinkedDataSignature from './common/CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export default class EcdsaSecp256r1Signature2019 extends CustomLinkedDataSignature {
  constructor({
    keypair,
    verificationMethod,
    verifier,
    signer,
    useProofValue,
  } = {}) {
    super({
      type: EcdsaSecp256r1SigName,
      LDKeyClass: EcdsaSecp256r1VerificationKey2019,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'ES256',
      signer:
        signer
        || EcdsaSecp256r1Signature2019.signerFactory(keypair, verificationMethod),
      verifier,
      useProofValue,
    });
    this.requiredKeyType = EcdsaSecp256r1VerKeyName;
  }

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
