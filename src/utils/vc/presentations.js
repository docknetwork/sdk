import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import { verifyCredential, checkCredential } from './credentials';

import defaultDocumentLoader from './document-loader';
import { getSuiteFromKeyDoc, expandJSONLD } from './helpers';
import { isRevocationCheckNeeded, checkRevocationStatus } from '../revocation';
import { getAndValidateSchemaIfPresent } from './schema';

import {
  expandedCredentialProperty,
  credentialContextField,
} from './constants';

import {
  EcdsaSepc256k1Signature2019, Ed25519Signature2018, Sr25519Signature2020,
} from './custom_crypto';

const { AuthenticationProofPurpose } = jsigs.purposes;
const { constants: { CREDENTIALS_CONTEXT_V1_URL } } = require('credentials-context');

/**
 * @param {object} presentation - An object that could be a presentation.
 * @throws {Error}
 * @private
 */
function checkPresentation(presentation) {
  // normalize to an array to allow the common case of context being a string
  const context = Array.isArray(presentation['@context'])
    ? presentation['@context'] : [presentation['@context']];

  // ensure first context is 'https://www.w3.org/2018/credentials/v1'
  if (context[0] !== CREDENTIALS_CONTEXT_V1_URL) {
    throw new Error(
      `"${CREDENTIALS_CONTEXT_V1_URL}" needs to be first in the `
      + 'list of contexts.',
    );
  }

  const types = jsonld.getValues(presentation, 'type');

  // check type presence
  if (!types.includes('VerifiablePresentation')) {
    throw new Error('"type" must include "VerifiablePresentation".');
  }
}

/**
 * Verifies that the VerifiablePresentation is well formed, and checks the
 * proof signature if it's present. Also verifies all the VerifiableCredentials
 * that are present in the presentation, if any.
 *
 * @param {object} [options={}]
 * @param {VerifiablePresentation} options.presentation
 *
 * @param {LinkedDataSignature|LinkedDataSignature[]} suite - See the definition
 *   in the `verify()` docstring, for this param.
 *
 * @param {boolean} [options.unsignedPresentation=false] - By default, this
 *   function assumes that a presentation is signed (and will return an error if
 *   a `proof` section is missing). Set this to `true` if you're using an
 *   unsigned presentation.
 *
 * Either pass in a proof purpose,
 * @param {AuthenticationProofPurpose} [options.presentationPurpose]
 *
 * or a default purpose will be created with params:
 * @param {string} [options.challenge] - Required if purpose is not passed in.
 * @param {string} [options.controller]
 * @param {string} [options.domain]
 *
 * @param {Function} [options.documentLoader]
 * @param {Function} [options.checkStatus]
 *
 * @throws {Error} If presentation is missing required params.
 *
 * @returns {Promise<VerifyPresentationResult>} The verification result.
 */
export async function verifyVCDM(presentation, options = {}) {
  const { unsignedPresentation } = options;

  checkPresentation(presentation);

  const documentLoader = options.documentLoader || defaultDocumentLoader();

  // FIXME: verify presentation first, then each individual credential
  // only if that proof is verified

  // if verifiableCredentials are present, verify them, individually
  let credentialResults;
  let verified = true;
  const credentials = jsonld.getValues(presentation, 'verifiableCredential');
  if (credentials.length > 0) {
    // verify every credential in `verifiableCredential`
    credentialResults = await Promise.all(credentials.map((credential) => verifyCredential(credential, { documentLoader, ...options })));

    for (const [i, credentialResult] of credentialResults.entries()) {
      credentialResult.credentialId = credentials[i].id;
    }

    const allCredentialsVerified = credentialResults.every((r) => r.verified);
    if (!allCredentialsVerified) {
      verified = false;
    }
  }

  if (unsignedPresentation) {
    // No need to verify the proof section of this presentation
    return { verified, results: [presentation], credentialResults };
  }

  const { controller, domain, challenge } = options;
  if (!options.presentationPurpose && !challenge) {
    throw new Error(
      'A "challenge" param is required for AuthenticationProofPurpose.',
    );
  }

  const purpose = options.presentationPurpose
    || new AuthenticationProofPurpose({ controller, domain, challenge });

  const presentationResult = await jsigs.verify(
    presentation, { purpose, documentLoader, ...options },
  );

  return {
    presentationResult,
    verified: verified && presentationResult.verified,
    credentialResults,
    error: presentationResult.error,
  };
}

/**
 * Verify a Verifiable Presentation. Returns the verification status and error in an object
 * @param {object} presentation The verifiable presentation
 * @param {VerifiableParams} Verify parameters
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function verifyPresentation(presentation, {
  challenge, domain, resolver = null, compactProof = true, forceRevocationCheck = true, revocationApi = null, schemaApi = null,
} = {}) {
  if (!presentation) {
    throw new TypeError(
      'A "presentation" property is required for verifying.',
    );
  }

  // TODO: support other purposes than the default of "authentication"
  let presVer;
  const options = {
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    challenge,
    domain,
    documentLoader: defaultDocumentLoader(resolver),
    compactProof,
    async checkStatus() {
      return { verified: true }; // To work with latest version, we check status elsewhere
    },
  };
  try {
    presVer = verifyVCDM(presentation, options);
  } catch (error) {
    presVer = {
      verified: false,
      results: [{ verified: false, error }],
      error,
    };
  }

  if (presVer.verified) {
    const expanded = await expandJSONLD(presentation);

    const credentials = expanded[expandedCredentialProperty];
    for (let i = 0; i < credentials.length; i++) {
      const credential = credentials[i]['@graph'][0];

      // Check for revocation only if the presentation is verified and revocation check is needed.
      if (isRevocationCheckNeeded(credential, forceRevocationCheck, revocationApi)) {
        const res = await checkRevocationStatus(credential, revocationApi); // eslint-disable-line

        // Return error for the first credential that does not pass revocation check.
        if (!res.verified) {
          return res;
        }
      }

      if (schemaApi) {
        // eslint-disable-next-line no-await-in-loop
        await getAndValidateSchemaIfPresent(credential, schemaApi, presentation[credentialContextField]);
      }
    }

    // If all credentials pass the revocation check, the let the result of presentation verification be returned.
  }
  return presVer;
}

/**
 * Create an unsigned Verifiable Presentation
 * @param {object|Array<object>} verifiableCredential - verifiable credential (or an array of them) to be bundled as a presentation.
 * @param {string} id - optional verifiable presentation id to use
 * @param {string} [holder] - optional presentation holder url
 * @return {object} verifiable presentation.
 */
export function createPresentation(verifiableCredential, id, holder = null) {
  const presentation = {
    '@context': [CREDENTIALS_CONTEXT_V1_URL],
    type: ['VerifiablePresentation'],
  };

  if (verifiableCredential) {
    const credentials = [].concat(verifiableCredential);
    // ensure all credentials are valid
    for (const credential of credentials) {
      checkCredential(credential);
    }
    presentation.verifiableCredential = credentials;
  }
  if (id) {
    presentation.id = id;
  }
  if (holder) {
    presentation.holder = holder;
  }

  checkPresentation(presentation);

  return presentation;
}

/**
 * Sign a Verifiable Presentation
 * @param {object} presentation - the one to be signed
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {DIDResolver} [resolver] - Resolver for DIDs.
 * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @return {Promise<VerifiablePresentation>} A VerifiablePresentation with a proof.
 */
export async function signPresentation(presentation, keyDoc, challenge, domain, resolver = null, compactProof = true) {
  // TODO: support other purposes than the default of "authentication"
  const suite = getSuiteFromKeyDoc(keyDoc);
  const options = {
    suite,
    domain,
    challenge,
    compactProof,
  };

  const purpose = options.purpose || new AuthenticationProofPurpose({
    domain,
    challenge,
  });

  const documentLoader = defaultDocumentLoader(resolver);
  return jsigs.sign(presentation, { purpose, documentLoader, ...options });
}
