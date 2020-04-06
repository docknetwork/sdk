import documentLoader from '../utils/vc/document-loader';
import {issue, verifyCredential, createPresentation, signPresentation, verify} from 'vc-js';
import {Ed25519KeyPair, suites} from 'jsonld-signatures';
const {Ed25519Signature2018} = suites;
import Secp256k1KeyPair from 'secp256k1-key-pair';
import {EcdsaSepc256k1Signature2019} from '../utils/vc/signatures';


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
   * @param {object} credential - Credential to be signed.
   * @return {object} The signed credential object.
   */
  async issueCredential(keyDoc, credential) {
    const suite = this.getSuiteFromKeyDoc(keyDoc);
    // The following code (including `issue` method) will modify the passed credential so clone it.
    const cred = {...credential};
    cred.issuer = keyDoc.controller;
    return await issue({
      suite,
      credential: cred
    });
  }

  /**
   * Verify a Verifiable Credential
   * @param {object} credential - verifiable credential to be verified.
   * @param {object} resolver - Resolver for DIDs.
   * @return {object} verification result.
   */
  async verifyCredential(credential, resolver) {
    return await verifyCredential({
      credential,
      suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019()],
      documentLoader: documentLoader(resolver)
    });
  }

  /**
   * Create an unsigned Verifiable Presentation
   * @param {object|Array<object>} credential - verifiable credential (or an array of them) to be bundled as a presentation.
   * @param {string} id - optional verifiable presentation id to use
   * @param {string} holder - optional presentation holder url
   * @return {object} verifiable presentation.
   */
  createPresentation(verifiableCredential, id, holder) {
    return createPresentation({
      verifiableCredential,
      id,
      holder
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
  async signPresentation(presentation, keyDoc, challenge, domain) {
    // TODO: support other purposes than the default of "authentication"
    const suite = this.getSuiteFromKeyDoc(keyDoc);
    return await signPresentation({
      presentation,
      suite,
      domain,
      challenge
    });
  }

  /**
   * Verify a Verifiable Presentation
   * @param {object} presentation - verifiable credential to be verified.
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @param {object} resolver - Resolver to resolve the issuer DID (optional)
   * @return {object} verification result.
   */
  async verifyPresentation(presentation, challenge, domain, resolver) {
    // TODO: support other purposes than the default of "authentication"
    return await verify({
      presentation,
      suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019()],
      challenge,
      domain,
      documentLoader: documentLoader(resolver)
    });
  }

}





const DEFAULT_CONTEXTS = [
  'https://www.w3.org/2018/credentials/v1',
  'https://www.w3.org/2018/credentials/examples/v1'
];
const DEFAULT_TYPE = ['VerifiableCredential'];
const DEFAULT_SUBJECT = {id:undefined};

/**
 * Representation of a Verifiable Credential.
 */
class VerifiableCredential {
  /**
   * Create a new Verifiable Credential instance.
   * @param {string} id - id of the credential
   * @param {array} context - context of the credential
   * @param {array} type - type of the credential
   * @param {object} subject - subject of the credential
   * @param {string} issuanceDate - issuanceDate of the credential
   * @param {string} expirationDate - expirationDate of the credential
   */
  constructor(
    id,
    {
      context =DEFAULT_CONTEXTS,
      type=DEFAULT_TYPE,
      subject=DEFAULT_SUBJECT,
      issuanceDate=new Date().toISOString(),
    } = {}
  ) {
    this.id = id;
    this.context = context;
    this.type = type;
    this.subject = subject;
    this.issuanceDate = issuanceDate;

  }

  /**
   * Add a context to this Credential's context array
   * @param {array} context - Array of contexts for the credential
   * @returns {VerifiableCredential}
   */
  addContext(context){
    this.context.push(context);
    return this;
  }

  /**
   * Add a type to this Credential's type array
   * @param {array} type - Array of types for the credential
   * @returns {VerifiableCredential}
   */
  addType(type){
    this.type.push(type);
    return this;
  }

  /**
   * Set a subject for this Credential
   * @param {object} subject -  Subject of the credential
   * @returns {VerifiableCredential}
   */
  setSubject(subject){
    this.subject = subject;
    return this;
  }

  /**
   * Set a issuance date for this Credential
   * @param {string} issuanceDate -  issuanceDate of the credential
   * @returns {VerifiableCredential}
   */
  setIssuanceDate(issuanceDate){
    this.issuanceDate = issuanceDate;
    return this;
  }

  /**
   * Set a expiration date for this Credential
   * @param {object} expirationDate -  expirationDate of the credential
   * @returns {VerifiableCredential}
   */
  setExpirationDate(expirationDate){
    this.expirationDate = expirationDate;
    return this;
  }

  /**
   * Define the JSON representation of a Verifiable Credential.
   * @returns {any}
   */
  toJSON(){
    const {context, subject, ...rest} = this;
    return {
      '@context': context,
      'credentialSubject': subject,
      ...rest
    };
  }

  /**
   * Sign a Verifiable Credential using the provided keyDoc
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @returns {Promise<{object}>}
   */
  async sign(keyDoc){
    let signed_vc =  await new VerifiableCredentialModule().issueCredential(
      keyDoc,
      this.toJSON()
    );
    this.proof = signed_vc.proof;
    this.issuer = signed_vc.issuer;
    return this;
  }

  /**
   * Verify a Verifiable Credential
   * @returns {Promise<{object}>}
   */
  async verify(){
    if (!this.proof){
      throw new Error('The current VC has no proof.');
    }
    return await new VerifiableCredentialModule().verifyCredential(this.toJSON());
  }

}

export default VerifiableCredentialModule;
export {VerifiableCredential};
