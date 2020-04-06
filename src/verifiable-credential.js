import {issueCredential, verifyCredential} from './utils/vc';

const DEFAULT_CONTEXTS = [
  'https://www.w3.org/2018/credentials/v1',
  'https://www.w3.org/2018/credentials/examples/v1'
];
const DEFAULT_TYPE = ['VerifiableCredential'];
const DEFAULT_SUBJECT = {id: null};

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
      context = DEFAULT_CONTEXTS,
      type = DEFAULT_TYPE,
      subject = DEFAULT_SUBJECT,
      issuanceDate = new Date().toISOString(),
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
  addContext(context) {
    this.context.push(context);
    return this;
  }

  /**
   * Add a type to this Credential's type array
   * @param {array} type - Array of types for the credential
   * @returns {VerifiableCredential}
   */
  addType(type) {
    this.type.push(type);
    return this;
  }

  /**
   * Set a subject for this Credential
   * @param {object} subject -  Subject of the credential
   * @returns {VerifiableCredential}
   */
  setSubject(subject) {
    this.subject = subject;
    return this;
  }

  /**
   * Set a issuance date for this Credential
   * @param {string} issuanceDate -  issuanceDate of the credential
   * @returns {VerifiableCredential}
   */
  setIssuanceDate(issuanceDate) {
    this.issuanceDate = issuanceDate;
    return this;
  }

  /**
   * Set a expiration date for this Credential
   * @param {object} expirationDate -  expirationDate of the credential
   * @returns {VerifiableCredential}
   */
  setExpirationDate(expirationDate) {
    this.expirationDate = expirationDate;
    return this;
  }

  /**
   * Define the JSON representation of a Verifiable Credential.
   * @returns {any}
   */
  toJSON() {
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
  async sign(keyDoc) {
    let signed_vc = await issueCredential(
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
  async verify() {
    if (!this.proof) {
      throw new Error('The current VC has no proof.');
    }
    return await verifyCredential(this.toJSON());
  }

}

export default VerifiableCredential;
