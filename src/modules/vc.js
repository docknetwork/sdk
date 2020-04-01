import documentLoader from '../utils/vc/document-loader';
import {issue, verifyCredential} from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
const {Ed25519Signature2018} = suites;
import {EcdsaSepc256k1Signature2019, Secp256k1KeyPair} from '../utils/vc/temp-signatures';


/** Class to sign and verify Verifiable Credentials */
class VerifiableCredentialModule {
  /**
   * Issue a Verifiable credential
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {object} credential - verifiable credential to be signed.
   * @return {object} The signed credential object.
   */
  async issue (keyDoc, credential) {
    const {controller: issuer, type} = keyDoc;

    let suite;
    switch(type) {
    case 'EcdsaSecp256k1VerificationKey2019':
      suite = new EcdsaSepc256k1Signature2019({key: new Secp256k1KeyPair(keyDoc)});
      break;
    case 'Ed25519VerificationKey2018':
      suite = new Ed25519Signature2018({key: new Ed25519KeyPair(keyDoc)});
      break;
    default:
      throw new Error(`Unknown key type ${type}.`);
    }

    credential.issuer = issuer;
    return await issue({
      credential,
      suite,
      documentLoader
    });
  }

  /**
   * Verify a Verifiable credential
   * @param {object} credential - verifiable credential to be verified.
   * @return {object} verification result.
   */
  async verify (credential) {
    return await verifyCredential({
      credential,
      suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019()],
      documentLoader: documentLoader
    });
  }
}

export default VerifiableCredentialModule;
