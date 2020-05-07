import {
  issueCredential,
  verifyCredential,
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
    this.subject = [];
    this.setIssuanceDate(new Date().toISOString());
  }

  static fromJSON(json) {
    const cert = new VerifiableCredential();
    cert.setId(json.id);

    json.type.forEach(type => {
      cert.addType(type);
    });

    (json.credentialSubject || json.subject).forEach(subject => {
      cert.addSubject(subject);
    });

    json['@context'].forEach(context => {
      cert.addContext(context);
    });

    cert.setStatus(json.credentialStatus || json.status)
      .setIssuanceDate(json.issuanceDate)
      .setExpirationDate(json.expirationDate);

    if (json.proof) {
      cert.setProof(json.proof);
    }

    if (json.issuer) {
      cert.setIssuer(json.issuer);
    }

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
    this.subject = getUniqueElementsFromArray([...this.subject, subject], JSON.stringify);
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
      context, subject, status, ...rest
    } = this;
    const credJson = {
      '@context': context,
      credentialSubject: subject,
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
   * @param {object} [revocationAPI] - An object representing a map. "revocation type -> revocation API". The API is used to check
   * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
   * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
   * @returns {Promise<VerifiableCredentialVerificationResult>}
   */
  async verify(resolver = null, compactProof = true, forceRevocationCheck = true, revocationAPI = null) {
    if (!this.proof) {
      throw new Error('The current Verifiable Credential has no proof.');
    }
    return verifyCredential(this.toJSON(), resolver, compactProof, forceRevocationCheck, revocationAPI);
  }
}

export default VerifiableCredential;
