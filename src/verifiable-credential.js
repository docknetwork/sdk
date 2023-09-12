import {
  expandJSONLD,
  issueCredential,
  verifyCredential,
  DEFAULT_CONTEXT,
  DEFAULT_TYPE,
} from './utils/vc/index';

import { validateCredentialSchema } from './utils/vc/schema';

import {
  ensureObjectWithId,
  isObject,
  ensureString,
  ensureURI,
  ensureValidDatetime,
} from './utils/type-helpers';
import { getUniqueElementsFromArray } from './utils/misc';

/**
 * @typedef {object} VerifiableCredentialVerificationResult The credential verification result
 * @property {Boolean} verified Is this credential verified or not
 * @property {array} results Verification results
 * @property {any} [error] Optional error
 */

/**
 * Representation of a Verifiable Credential.
 */
class VerifiableCredential {
  /**
   * Create a new Verifiable Credential instance.
   * @param {string} id - id of the credential
   */
  constructor(id) {
    if (id) {
      this.setId(id);
    }

    this.context = [DEFAULT_CONTEXT];
    this.type = [DEFAULT_TYPE];
    this.credentialSubject = [];
    this.setIssuanceDate(new Date().toISOString());
  }

  /**
   * Sets the credential's ID
   * @param {string} id - Signed credential's ID
   * @returns {VerifiableCredential}
   */
  setId(id) {
    this.constructor.verifyID(id);
    this.id = id;
    return this;
  }

  /**
   * Fail if the given verifiable credential id isn't a valid URI.
   * @param {*} id
   */
  static verifyID(id) {
    ensureURI(id);
  }

  /**
   * Sets the credential's issuer DID
   * @param {string} issuer - the issuer's did
   * @returns {VerifiableCredential}
   */
  setIssuer(issuer) {
    this.issuer = issuer;
    return this;
  }

  /**
   * Sets the credential's proof
   * @param {object} proof - Signed credential proof
   * @returns {VerifiableCredential}
   */
  setProof(proof) {
    this.proof = proof;
    return this;
  }

  /**
   * Sets the `credentialSchema` field of the credential with the given id and type as specified in the RFC.
   * @param {string} id - schema ID URI
   * @param {string} type - type of the credential schema
   */
  setSchema(id, type) {
    this.constructor.verifyID(id);
    this.credentialSchema = {
      id,
      type,
    };
  }

  /**
   * Check that the credential is compliant with given JSON schema, meaning `credentialSubject` has the
   * structure specified by the given JSON schema. Use `validateCredentialSchema` but exclude subject's id.
   * Allows issuer to validate schema before adding it.
   * @param {object} schema - The schema to validate with
   * @returns {Promise<Boolean>}
   */
  async validateSchema(schema) {
    if (!this.credentialSubject) {
      throw new Error('No credential subject defined');
    }

    const expanded = await expandJSONLD(this.toJSON());
    return validateCredentialSchema(expanded, schema, this.context);
  }

  /**
   * Sets the context to the given value, overrding all others
   * @param {string|object} context - Context to assign
   * @returns {VerifiableCredential}
   */
  setContext(context) {
    if (!isObject(context) && !Array.isArray(context)) {
      this.constructor.verifyID(context);
    }
    this.context = context;
    return this;
  }

  /**
   * Add a context to this Credential's context array. Duplicates are omitted.
   * @param {string|object} context - Context to add to the credential context array
   * @returns {VerifiableCredential}
   */
  addContext(context) {
    if (!isObject(context)) {
      this.constructor.verifyID(context);
    }
    this.context = getUniqueElementsFromArray(
      [...this.context, context],
      JSON.stringify,
    );
    return this;
  }

  /**
   * Add a type to this Credential's type array. Duplicates are omitted.
   * @param {string} type - Type to add to the credential type array
   * @returns {VerifiableCredential}
   */
  addType(type) {
    ensureString(type);
    this.type = [...new Set([...this.type, type])];
    return this;
  }

  /**
   * Add a subject to this Credential. Duplicates are omitted.
   * @param {object} subject -  Subject of the credential
   * @returns {VerifiableCredential}
   */
  addSubject(subject) {
    if (!this.credentialSubject || this.credentialSubject.length === 0) {
      this.credentialSubject = [subject];
    }

    const subjects = this.credentialSubject.length
      ? this.credentialSubject
      : [this.credentialSubject];
    this.credentialSubject = getUniqueElementsFromArray(
      [...subjects, subject],
      JSON.stringify,
    );
    return this;
  }

  /**
   * Set the subject for this Credential
   * @param {object|array} subject - Subject of the credential as object or array
   * @returns {VerifiableCredential}
   */
  setSubject(subject) {
    if (!isObject(subject) && !Array.isArray(subject)) {
      throw new Error('credentialSubject must be either an object or array');
    }
    this.credentialSubject = subject;
    return this;
  }

  /**
   * Set a status for this Credential
   * @param {object} status -  Status of the credential
   * @returns {VerifiableCredential}
   */
  setStatus(status) {
    ensureObjectWithId(status, 'credentialStatus');
    if (!status.type) {
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
    ensureValidDatetime(issuanceDate);
    this.issuanceDate = issuanceDate;
    return this;
  }

  /**
   * Set a expiration date for this Credential
   * @param {object} expirationDate -  expirationDate of the credential
   * @returns {VerifiableCredential}
   */
  setExpirationDate(expirationDate) {
    ensureValidDatetime(expirationDate);
    this.expirationDate = expirationDate;
    return this;
  }

  /**
   * Define the JSON representation of a Verifiable Credential.
   * @returns {object}
   */
  toJSON() {
    const { context, status, ...rest } = this;
    const credJson = {
      '@context': context,
    };
    if (status) {
      credJson.credentialStatus = status;
    }
    return {
      ...credJson,
      ...rest,
    };
  }

  /**
   * Sign a Verifiable Credential using the provided keyDoc
   * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
   * @param {object} [issuerObject] - Optional issuer object to assign
   * @param {Boolean} [addSuiteContext] - Toggles the default
   *   behavior of each signature suite enforcing the presence of its own
   *   `@context` (if it is not present, it's added to the context list).
   * @param {(jsonld|jwt|proofValue)} [type] - Optional format/type of the credential (JSON-LD, JWT, proofValue)
   * @returns {Promise<VerifiableCredential>}
   */
  async sign(
    keyDoc,
    compactProof = true,
    issuerObject = null,
    addSuiteContext = true,
    documentLoader = null,
    type = null,
  ) {
    const signedVC = await issueCredential(
      keyDoc,
      this.toJSON(),
      compactProof,
      documentLoader,
      null,
      void 0,
      issuerObject,
      addSuiteContext,
      type,
    );
    this.setProof(signedVC.proof);
    this.issuer = signedVC.issuer;
    this.context = signedVC['@context'];
    return this;
  }

  /**
   * Verify a Verifiable Credential
   * @param {object} [params] Verify parameters (TODO: add type info for this object)
   * @returns {Promise<VerifiableCredentialVerificationResult>}
   */
  async verify({
    resolver = null,
    compactProof = true,
    skipRevocationCheck = false,
    skipSchemaCheck = false,
    suite = [],
  } = {}) {
    if (!this.proof) {
      throw new Error('The current Verifiable Credential has no proof.');
    }

    return verifyCredential(this.toJSON(), {
      resolver,
      compactProof,
      skipRevocationCheck,
      skipSchemaCheck,
      suite,
    });
  }

  /**
   * Sets this credential's properties based on a JSON object
   * @param {object} json - VC JSON
   * @returns {VerifiableCredential}
   */
  setFromJSON(json) {
    const subject = json.credentialSubject || json.subject;
    if (subject) {
      const subjects = subject.length ? subject : [subject];
      subjects.forEach((value) => {
        this.addSubject(value);
      });
    }

    if (json.proof) {
      this.setProof(json.proof);
    }

    if (json.issuer) {
      this.setIssuer(json.issuer);
    }

    const status = json.credentialStatus || json.status;
    if (status) {
      this.setStatus(status);
    }

    if (json.issuanceDate) {
      this.setIssuanceDate(json.issuanceDate);
    }

    if (json.expirationDate) {
      this.setExpirationDate(json.expirationDate);
    }

    Object.assign(this, json);
    return this;
  }

  /**
   * Creates a new VerifiableCredential instance from a JSON object
   * @param {object} json - VC JSON
   * @returns {VerifiableCredential}
   */
  static fromJSON(json) {
    const cert = new this(json.id);
    const contexts = json['@context'];
    if (contexts) {
      cert.setContext(contexts);
    } else {
      throw new Error(
        'No context found in JSON object, verifiable credentials must have a @context field.',
      );
    }

    const types = json.type;
    if (types) {
      cert.type = [];
      if (types.length !== undefined) {
        types.forEach((typeVal) => {
          cert.addType(typeVal);
        });
      } else {
        cert.addType(types);
      }
    } else {
      throw new Error(
        'No type found in JSON object, verifiable credentials must have a type field.',
      );
    }

    return cert.setFromJSON(json);
  }
}

export default VerifiableCredential;
