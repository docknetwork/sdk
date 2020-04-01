import documentLoader from '../utils/vc/document-loader';
import {issue, verifyCredential, createPresentation, signPresentation, verify} from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
const {Ed25519Signature2018} = suites;
import {EcdsaSepc256k1Signature2019, Secp256k1KeyPair} from '../utils/vc/temp-signatures';


/** Class to sign and verify Verifiable Credentials */
class VerifiableCredentialModule {

  /**
   * Get signature suite from a keyDoc
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @returns {EcdsaSepc256k1Signature2019|Ed25519Signature2018} - signature suite.
   */
  getSuiteFromKeyDoc(keyDoc) {
    switch(keyDoc.type) {
    case 'EcdsaSecp256k1VerificationKey2019':
      return new EcdsaSepc256k1Signature2019({key: new Secp256k1KeyPair(keyDoc)});
    case 'Ed25519VerificationKey2018':
      return new Ed25519Signature2018({key: new Ed25519KeyPair(keyDoc)});
    default:
      throw new Error(`Unknown key type ${keyDoc.type}.`);
    }
  }

  /**
   * Issue a Verifiable credential
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {object} credential - verifiable credential to be signed.
   * @return {object} The signed credential object.
   */
  async issueCredential (keyDoc, credential) {
    const suite = this.getSuiteFromKeyDoc(keyDoc);
    credential.issuer = keyDoc.controller;
    return await issue({
      credential,
      suite,
      documentLoader
    });
  }

  /**
   * Verify a Verifiable Credential
   * @param {object} credential - verifiable credential to be verified.
   * @return {object} verification result.
   */
  async verifyCredential (credential) {
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
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @return {Promise<{VerifiablePresentation}>} A VerifiablePresentation with a proof.
   */
  async signPresentation (presentation, keyDoc, challenge, domain) {
    // TODO: support other purposes than the default of "authentication"
    const suite = this.getSuiteFromKeyDoc(keyDoc);
    return signPresentation({
      presentation: presentation,
      suite: suite,
      domain: domain,
      challenge: challenge,
      documentLoader: documentLoader
    });
  }

  /**
   * Verify a Verifiable Presentation
   * @param {object} presentation - verifiable credential to be verified.
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @return {object} verification result.
   */
  async verifyPresentation (presentation, challenge, domain) {
    // TODO: support other purposes than the default of "authentication"
    return await verify({
      presentation,
      suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019()],
      challenge: challenge,
      domain: domain,
      documentLoader: documentLoader
    });
  }
}

export default VerifiableCredentialModule;
