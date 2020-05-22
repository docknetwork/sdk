import {
  issueCredential,
  verifyCredential,
  validateCredentialSchema,
} from './utils/vc';
import {
  ensureObjectWithId,
  ensureObjectWithKeyOrURI,
  ensureString,
  ensureURI,
  ensureValidDatetime,
} from './utils/type-helpers';
import { getUniqueElementsFromArray } from './utils/misc';

const DEFAULT_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const DEFAULT_TYPE = 'VerifiableCredential';

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

  static fromJSON(json) {
    const cert = new VerifiableCredential(json.id);

    const types = json.type;
    if (types) {
      types.forEach((type) => {
        cert.addType(type);
      });
    }

    const subject = (json.credentialSubject || json.subject);
    if (subject) {
      const subjects = subject.length ? subject : [subject];
      subjects.forEach((value) => {
        cert.addSubject(value);
      });
    }

    const contexts = json['@context'];
    if (contexts) {
      contexts.forEach((context) => {
        cert.addContext(context);
      });
    }

    if (json.proof) {
      cert.setProof(json.proof);
    }

    if (json.issuer) {
      cert.setIssuer(json.issuer);
    }

    const status = (json.credentialStatus || json.status);
    if (status) {
      cert.setStatus(status);
    }

    if (json.issuanceDate) {
      cert.setIssuanceDate(json.issuanceDate);
    }

    if (json.expirationDate) {
      cert.setExpirationDate(json.expirationDate);
    }

    Object.assign(cert, json);
    return cert;
  }

  /**
   * Sets the credential's ID
   * @param {string} id - Signed credential's ID
   * @returns {VerifiableCredential}
   */
  setId(id) {
    ensureURI(id);
    this.id = id;
    return this;
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
    ensureURI(id);
    this.credentialSchema = {
      id, type,
    };
  }

  /**
   * Check that the credential is compliant with given JSON schema, meaning `credentialSubject` has the
   * structure specified by the given JSON schema. Use `validateCredentialSchema` but exclude subject's id.
   * Allows issuer to validate schema before adding it.
   * @param {object} schema - The schema to validate with
   * @returns {Boolean}
   */
  validateSchema(schema) {
    if (!this.credentialSubject) {
      throw new Error('No credential subject defined');
    }

    return validateCredentialSchema(this, schema);
  }

  /**
   * Add a context to this Credential's context array. Duplicates are omitted.
   * @param {string|object} context - Context to add to the credential context array
   * @returns {VerifiableCredential}
   */
  addContext(context) {
    ensureObjectWithKeyOrURI(context, '@context', 'context');
    this.context = getUniqueElementsFromArray([...this.context, context], JSON.stringify);
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
    ensureObjectWithId(subject, 'credentialSubject');
    if (!this.credentialSubject || this.credentialSubject.length === 0) {
      this.credentialSubject = [subject];
    }

    const subjects = this.credentialSubject.length ? this.credentialSubject : [this.credentialSubject];
    this.credentialSubject = getUniqueElementsFromArray([...subjects, subject], JSON.stringify);
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
   * @returns {any}
   */
  toJSON() {
    const {
      context, status, ...rest
    } = this;
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
   * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
   * @returns {Promise<VerifiableCredential>}
   */
  async sign(keyDoc, compactProof = true) {
    const signedVC = await issueCredential(
      keyDoc,
      this.toJSON(),
      compactProof,
    );
    this.setProof(signedVC.proof);
    this.issuer = signedVC.issuer;
    return this;
  }

  /**
   * Verify a Verifiable Credential
   * @param {object} [resolver] - Resolver for DIDs.
   * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
   * @param {Boolean} [forceRevocationCheck] - Whether to force revocation check or not.
   * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
   * @param {object} [revocationApi] - An object representing a map. "revocation type -> revocation API". The API is used to check
   * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
   * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
   * @param {object} [schemaApi] - An object representing a map. "schema type -> schema API". The API is used to get
   * a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
   * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
   * @returns {Promise<VerifiableCredentialVerificationResult>}
   */
  async verify({resolver = null, compactProof = true, forceRevocationCheck = true, revocationApi = null, schemaApi = null}) {
    if (!this.proof) {
      throw new Error('The current Verifiable Credential has no proof.');
    }
    return verifyCredential({
      credential: this.toJSON(),
      resolver,
      compactProof,
      forceRevocationCheck,
      revocationApi,
      schemaApi,
    });
  }
}

export default VerifiableCredential;
