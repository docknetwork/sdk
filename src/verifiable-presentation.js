import { signPresentation, verifyPresentation } from './utils/vc/index';

import {
  ensureObjectWithId,
  ensureString,
  ensureURI,
  isObject,
} from './utils/type-helpers';

import { getUniqueElementsFromArray } from './utils/misc';
import VerifiableCredential from './verifiable-credential';
import DIDResolver from "./resolver/did/did-resolver"; // eslint-disable-line

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

  static fromJSON(json) {
    const {
      verifiableCredential, id, type, ...rest
    } = json;
    const vp = new VerifiablePresentation(id);

    if (type) {
      vp.type = [];
      if (type.length !== undefined) {
        type.forEach((typeVal) => {
          vp.addType(typeVal);
        });
      } else {
        vp.addType(type);
      }
    } else {
      throw new Error(
        'No type found in JSON object, verifiable presentations must have a type field.',
      );
    }

    const context = rest['@context'];
    if (context) {
      vp.setContext(rest['@context']);
      delete rest['@context'];
    } else {
      throw new Error(
        'No context found in JSON object, verifiable presentations must have a @context field.',
      );
    }

    if (verifiableCredential) {
      if (verifiableCredential.length) {
        verifiableCredential.forEach((credential) => {
          vp.addCredential(credential);
        });
      } else {
        vp.addCredential(verifiableCredential);
      }
    }

    Object.assign(vp, rest);
    return vp;
  }

  /**
   * Sets the context to the given value, overrding all others
   * @param {string|object} context - Context to assign
   * @returns {VerifiablePresentation}
   */
  setContext(context) {
    if (!isObject(context) && !Array.isArray(context)) {
      ensureURI(context);
    }
    this.context = context;
    return this;
  }

  /**
   * Add a context to this Presentation's context array. Duplicates are omitted.
   * @param {string|object} context - Context to add to the presentation context array
   * @returns {VerifiablePresentation}
   */
  addContext(context) {
    if (!isObject(context)) {
      ensureURI(context);
    }
    this.context = getUniqueElementsFromArray(
      [...this.context, context],
      JSON.stringify,
    );
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
   * Add a Verifiable Credential to this Presentation. Duplicates will be ignored.
   * @param {object} credential -  Verifiable Credential for the presentation
   * @returns {VerifiablePresentation}
   */
  addCredential(credential) {
    let cred = credential;
    if (credential instanceof VerifiableCredential) {
      cred = credential.toJSON();
    }
    ensureObjectWithId(cred, 'credential');
    this.credentials = getUniqueElementsFromArray(
      [...this.credentials, cred],
      JSON.stringify,
    );

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
    this.context = signedVP['@context'];
    return this;
  }

  /**
   * Verify a Verifiable Presentation
   * @param {object} [params] Verify parameters (TODO: add type info for this object)
   * @returns {Promise<VerifiablePresentationVerificationResult>} - verification result.
   */
  async verify({
    challenge,
    domain,
    resolver = null,
    compactProof = true,
    skipRevocationCheck = false,
    skipSchemaCheck = false,
    verifyMatchingIssuersForRevocation = true,
    suite = [],
  } = {}) {
    if (!this.proof) {
      throw new Error('The current VerifiablePresentation has no proof.');
    }

    return verifyPresentation(this.toJSON(), {
      challenge,
      domain,
      resolver,
      compactProof,
      skipRevocationCheck,
      skipSchemaCheck,
      verifyMatchingIssuersForRevocation,
      suite,
    });
  }
}

export default VerifiablePresentation;
