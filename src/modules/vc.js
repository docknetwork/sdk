import documentLoader from './vc-helpers/document-loader';
import {issue, verifyCredential, createPresentation, signPresentation} from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
const {Ed25519Signature2018} = suites;
import {EcdsaSepc256k1Signature2019, Secp256k1KeyPair} from './vc-helpers/temp-signatures';


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

  /**
   * Create an unsigned Verifiable Presentation
   * @param {object|Array<object>} credential - verifiable credential (or an array of them) to be bundled as a presentation.
   * @param {string} id - optional verifiable presentation id to use
   * @param {string} holder - optional presentation holder url
   * @return {object} verifiable presentation.
   */
  async createPresentation (credential, id, holder) {
    return createPresentation({
      verifiableCredential: credential,
      id: id,
      holder: holder
    });
  }

  /**
   * Sign a Verifiable Presentation
   * @param {object} presentation - the one to be signed
   * @param {object} suite - passed in to sign()
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @return {Promise<{VerifiablePresentation}>} A VerifiablePresentation with
   *   a proof.
   */
  async signPresentation (presentation, suite, challenge, domain) {

    return signPresentation({
      presentation: presentation,
      suite: suite,
      domain: domain,
      challenge: challenge,
      documentLoader: documentLoader
    });
  }
}

export default VerifiableCredentialModule;
