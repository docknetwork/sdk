import {
  ensureObjectWithId,
  ensureObjectWithKeyOrURI,
  ensureString,
  ensureURI,
  signPresentation,
  verifyPresentation
} from './utils/vc';
import VerifiableCredential from './verifiable-credential';

const DEFAULT_CONTEXT = 'https://www.w3.org/2018/credentials/v1';
const DEFAULT_TYPE = 'VerifiablePresentation';

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
    ensureString(id);
    this.id = id;

    this.context = [DEFAULT_CONTEXT];
    this.type = [DEFAULT_TYPE];
    this.credentials = [];
  }

  /**
   * Add a context to this Presentation's context array
   * @param {str|object} context - Context to add to the presentation context array
   * @returns {VerifiablePresentation}
   */
  addContext(context) {
    ensureObjectWithKeyOrURI(context, '@context', 'context');
    this.context.push(context);
    return this;
  }

  /**
   * Add a type to this Presentation's type array
   * @param {str} type - Type to add to the presentation type array
   * @returns {VerifiablePresentation}
   */
  addType(type) {
    ensureString(type);
    this.type.push(type);
    return this;
  }

  /**
   * Set a holder for this Presentation
   * @param {str} holder - Holder to add to the presentation
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
    if (credential && credential instanceof VerifiableCredential){
      credential = credential.toJSON();
    }
    ensureObjectWithId(credential, 'credential');
    this.credentials.push(credential);
    return this;
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
   * @param {Boolean} forceRevocationCheck - Whether to force revocation check or not.
   * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
   * @param {object} revocationAPI - An object representing a map. "revocation type -> revocation API". The API is used to check
   * revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
   * as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
   * @returns {Promise<{object}>} - verification result.
   */
  async verify(challenge, domain, resolver, compactProof = true, forceRevocationCheck = true, revocationAPI) {
    if (!this.proof) {
      throw new Error('The current VerifiablePresentation has no proof.');
    }
    return await verifyPresentation(
      this.toJSON(),
      challenge,
      domain,
      resolver,
      compactProof,
      forceRevocationCheck,
      revocationAPI
    );
  }

}

export default VerifiablePresentation;
