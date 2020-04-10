import {
  isObject,
  isString,
  issueCredential,
  verifyCredential
} from './utils/vc';
import vcjs from 'vc-js';

const DEFAULT_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1'
];
const DEFAULT_TYPE = ['VerifiableCredential'];

/**
 * Representation of a Verifiable Credential.
 */
class VerifiableCredential {
  /**
   * Create a new Verifiable Credential instance.
   * @param {string} id - id of the credential
   */
  constructor(id) {
    this.ensureString(id);
    this.id = id;

    this.context = DEFAULT_CONTEXT;
    this.type = DEFAULT_TYPE;
    this.subject = [];
    this.setIssuanceDate(new Date().toISOString());
  }

  /**
   * Add a context to this Credential's context array
   * @param {str} context - Context to add to the credential context array
   * @returns {VerifiableCredential}
   */
  addContext(context) {
    this.ensureUrl(context);
    this.context.push(context);
    return this;
  }

  /**
   * Add a type to this Credential's type array
   * @param {str} type - Type to add to the credential type array
   * @returns {VerifiableCredential}
   */
  addType(type) {
    this.ensureString(type);
    this.type.push(type);
    return this;
  }

  /**
   * Add a subject to this Credential
   * @param {object} subject -  Subject of the credential
   * @returns {VerifiableCredential}
   */
  addSubject(subject) {
    this.ensureObjectWithId(subject, 'credentialSubject');
    this.subject.push(subject);
    return this;
  }

  /**
   * Set a status for this Credential
   * @param {object} status -  Status of the credential
   * @returns {VerifiableCredential}
   */
  setStatus(status) {
    this.ensureObjectWithId(status, 'credentialStatus');
    if(!status.type){
      throw new Error('"credentialStatus" must include a type.');
    }
    this.status = status;
    return this;
  }

  /**
   * Set a issuance date for this Credential
   * @param {string} issuanceDate -  issuanceDate of the credential
   * @returns {VerifiableCredential}
   */
  setIssuanceDate(issuanceDate) {
    this.ensureValidDatetime(issuanceDate);
    this.issuanceDate = issuanceDate;
    return this;
  }

  /**
   * Set a expiration date for this Credential
   * @param {object} expirationDate -  expirationDate of the credential
   * @returns {VerifiableCredential}
   */
  setExpirationDate(expirationDate) {
    this.ensureValidDatetime(expirationDate);
    this.expirationDate = expirationDate;
    return this;
  }


  /**
   * Fail if the given value isn't a string
   * @param value
   */
  ensureString(value){
    if (!isString(value)){
      throw new Error(`${value} needs to be a string.`);
    }
  }

  /**
   * Fail if the given value isn't an object
   * @param value
   */
  ensureObject(value){
    if (!isObject(value)){
      throw new Error(`${value} needs to be an object.`);
    }
  }

  /**
   * Fail if the given value isn't an object
   * @param value
   * @param {string} name - Name of the object. Used in constructing error.
   */
  ensureObjectWithId(value, name){
    this.ensureObject(value);
    if(!value.id){
      throw new Error(`"${name}" must include an id.`);
    }
  }

  /**
   * Fail if the given datetime isn't valid.
   * @param datetime
   */
  ensureValidDatetime(datetime){
    if(!vcjs.dateRegex.test(datetime)) {
      throw new Error(`${datetime} needs to be a valid datetime.`);
    }
  }
  ensureUrl(url) {
    this.ensureString(url);
    var pattern = new RegExp('^(https?:\\/\\/)?'+
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+
      '((\\d{1,3}\\.){3}\\d{1,3}))'+
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+
      '(\\?[;&a-z\\d%_.~+=-]*)?'+
      '(\\#[-a-z\\d_]*)?$','i');
    if (!pattern.test(url)){
      throw new Error(`${url} needs to be a valid URL.`);
    }
  }
  /**
   * Define the JSON representation of a Verifiable Credential.
   * @returns {any}
   */
  toJSON() {
    const {context, subject, status, ...rest} = this;
    const credJson = {
      '@context': context,
      'credentialSubject': subject
    };
    if (status) {
      credJson['credentialStatus'] = status;
    }
    return {
      ...credJson,
      ...rest
    };
  }

  /**
   * Sign a Verifiable Credential using the provided keyDoc
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
   * @returns {Promise<{object}>}
   */
  async sign(keyDoc, compactProof = true) {
    let signed_vc = await issueCredential(
      keyDoc,
      this.toJSON(),
      compactProof
    );
    this.proof = signed_vc.proof;
    this.issuer = signed_vc.issuer;
    return this;
  }

  /**
   * Verify a Verifiable Credential
   * @param {object} resolver - Resolver for DIDs.
   * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
   * @param {Boolean} forceRevocationCheck - Whether to force revocation check or not.
   * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
   * @param {object} revocationAPI - An object representing a map. "revocation type -> revocation API". The API is used to check
   * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
   * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
   * @returns {Promise<{object}>}
   */
  async verify(resolver, compactProof = true, forceRevocationCheck = true, revocationAPI) {
    if (!this.proof) {
      throw new Error('The current Verifiable Credential has no proof.');
    }
    return await verifyCredential(this.toJSON(), resolver, compactProof, forceRevocationCheck, revocationAPI);
  }

}

export default VerifiableCredential;
