import {
  isObject,
  isString,
  signPresentation,
  verifyPresentation
} from './utils/vc';
import vcjs from 'vc-js';
import VerifiableCredential from './verifiable-credential';

const DEFAULT_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1'
];
const DEFAULT_TYPE = ['VerifiablePresentation'];

/**
 * Representation of a Verifiable Presentation.
 */
class VerifiablePresentation {
  /**
   * Create a new Verifiable Presentation instance.
   * @param {string} id - id of the presentation
   * @returns {VerifiablePresentation}
   */
  constructor(id) {
    this.ensureString(id);
    this.id = id;

    this.context = DEFAULT_CONTEXT;
    this.type = DEFAULT_TYPE;
    this.credentials = [];
  }

  /**
   * Add a context to this Presentation's context array
   * @param {str} context - Context to add to the presentation context array
   * @returns {VerifiablePresentation}
   */
  addContext(context) {
    this.ensureUrl(context);
    this.context.push(context);
    return this;
  }

  /**
   * Add a type to this Presentation's type array
   * @param {str} type - Type to add to the presentation type array
   * @returns {VerifiablePresentation}
   */
  addType(type) {
    this.ensureString(type);
    this.type.push(type);
    return this;
  }

  /**
   * Set a holder for this Presentation
   * @param {str} holder - Holder to add to the presentation
   * @returns {VerifiablePresentation}
   */
  setHolder(holder) {
    this.ensureUrl(holder);
    this.holder = holder;
    return this;
  }

  /**
   * Add a Verifiable Credential to this Presentation
   * @param {object} credential -  Verifiable Credential for the presentation
   * @returns {VerifiablePresentation}
   */
  addCredential(credential) {
    if (credential && credential instanceof VerifiableCredential){
      credential = credential.toJSON();
    }
    this.ensureObjectWithId(credential, 'credential');
    this.credentials.push(credential);
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

  /**
   * Fail if the given string isn't a URL
   * @param url
   */
  //TODO: change this to URI
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
   * Define the JSON representation of a Verifiable Presentation.
   * @returns {any}
   */
  toJSON() {
    const {context, credentials, ...rest} = this;
    return {
      '@context': context,
      'verifiableCredential': credentials,
      ...rest
    };
  }

  /**
   * Sign a Verifiable Presentation using the provided keyDoc
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @param {Resolver} resolver - Resolver for DIDs.
   * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
   * @returns {Promise<{object}>}
   */
  async sign(keyDoc, challenge, domain, resolver, compactProof = true) {
    let signed_vp = await signPresentation(
      this.toJSON(),
      keyDoc,
      challenge,
      domain,
      resolver,
      compactProof
    );
    this.proof = signed_vp.proof;
    return this;
  }

  /**
   * Verify a Verifiable Presentation
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @param {Resolver} resolver - Resolver to resolve the issuer DID (optional)
   * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
   * @returns {Promise<{object}>} - verification result.
   */
  async verify(challenge, domain, resolver, compactProof = true) {
    if (!this.proof) {
      throw new Error('The current VerifiablePresentation has no proof.');
    }
    return await verifyPresentation(
      this.toJSON(),
      challenge,
      domain,
      resolver,
      compactProof
    );
  }

}

export default VerifiablePresentation;
