import {
  signPresentation,
  verifyPresentation,
} from './utils/vc';
import VerifiableCredential from './verifiable-credential';
import {
  ensureObjectWithId, ensureObjectWithKeyOrURI, ensureString, ensureURI,
} from './utils/type-helpers';

import DIDResolver from './did-resolver'; // eslint-disable-line

const DEFAULT_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const DEFAULT_TYPE = 'VerifiablePresentation';

/**
 * @typedef {object} VerifiablePresentationVerificationResult The presentation verification result
 * @property {object} presentationResult Is this presentqtion verified or not
 * @property {array} credentialResults Verification results
 * @property {Boolean} verified Is verified or not
 * @property {any} [error] Optional error
 */

/**
 * Representation of a Verifiable Presentation.
 */
class VerifiablePresentation {
  /**
   * Create a new Verifiable Presentation instance.
   * @param {string} id - id of the presentation
   * @constructor
   */
  constructor(id) {
    ensureURI(id);
    this.id = id;
    this.context = [DEFAULT_CONTEXT];
    this.type = [DEFAULT_TYPE];
    this.credentials = [];
    this.proof = null;
  }

  /**
   * Add a context to this Presentation's context array. Duplicates are omitted.
   * @param {string|object} context - Context to add to the presentation context array
   * @returns {VerifiablePresentation}
   */
  addContext(context) {
    ensureObjectWithKeyOrURI(context, '@context', 'context');
    this.context = [...new Set([...this.context, context])];
    return this;
  }

  /**
   * Add a type to this Presentation's type array. Duplicates are omitted.
   * @param {string} type - Type to add to the presentation type array
   * @returns {VerifiablePresentation}
   */
  addType(type) {
    ensureString(type);
    this.type = [...new Set([...this.type, type])];
    return this;
  }

  /**
   * Set a holder for this Presentation
   * @param {string} holder - Holder to add to the presentation
   * @returns {VerifiablePresentation}
   */
  setHolder(holder) {
    ensureURI(holder);
    this.holder = holder;
    return this;
  }

  /**
   * Add a Verifiable Credential to this Presentation
   * @param {object} credential -  Verifiable Credential for the presentation
   * @returns {VerifiablePresentation}
   */
  addCredential(credential) {
    let cred = credential;
    if (credential instanceof VerifiableCredential) {
      cred = credential.toJSON();
    }
    ensureObjectWithId(cred, 'credential');
    this.credentials.push(cred);
    return this;
  }

  /**
   * Define the JSON representation of a Verifiable Presentation.
   * @returns {object}
   */
  toJSON() {
    const { context, credentials, ...rest } = this;
    return {
      '@context': context,
      verifiableCredential: credentials,
      ...rest,
    };
  }

  /**
   * Sign a Verifiable Presentation using the provided keyDoc
   * @param {object} keyDoc - document with `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @param {DIDResolver} [resolver] - Resolver for DIDs.
   * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
   * @returns {Promise<VerifiablePresentation>}
   */
  async sign(keyDoc, challenge, domain, resolver = null, compactProof = true) {
    const signedVP = await signPresentation(
      this.toJSON(),
      keyDoc,
      challenge,
      domain,
      resolver,
      compactProof,
    );
    this.proof = signedVP.proof.pop();
    return this;
  }

  /**
   * Verify a Verifiable Presentation
   * @param {string} challenge - proof challenge Required.
   * @param {string} domain - proof domain (optional)
   * @param {DIDResolver} [resolver] - Resolver to resolve the issuer DID (optional)
   * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
   * @param {Boolean} [forceRevocationCheck] - Whether to force revocation check or not.
   * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
   * @param {object} [revocationAPI] - An object representing a map. "revocation type -> revocation API". The API is used to check
   * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
   * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
   * @returns {Promise<VerifiablePresentationVerificationResult>} - verification result.
   */
  async verify(challenge, domain, resolver = null, compactProof = true, forceRevocationCheck = true, revocationAPI = null) {
    if (!this.proof) {
      throw new Error('The current VerifiablePresentation has no proof.');
    }

    return verifyPresentation(
      this.toJSON(),
      challenge,
      domain,
      resolver,
      compactProof,
      forceRevocationCheck,
      revocationAPI,
    );
  }
}

export default VerifiablePresentation;
