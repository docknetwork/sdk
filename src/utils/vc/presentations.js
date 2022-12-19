import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import { BBSPlusPublicKeyG2 } from '@docknetwork/crypto-wasm-ts';
import { Presentation } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials/presentation';
import b58 from 'bs58';
import { verifyCredential } from './credentials';
import DIDResolver from '../../did-resolver'; // eslint-disable-line

import defaultDocumentLoader from './document-loader';
import { getSuiteFromKeyDoc } from './helpers';

import {
  DEFAULT_CONTEXT_V1_URL,
} from './constants';

import {
  EcdsaSepc256k1Signature2019, Ed25519Signature2018, Sr25519Signature2020,
} from './custom_crypto';

import Bls12381BBSSignatureDock2022 from './crypto/Bls12381BBSSignatureDock2022';

const { AuthenticationProofPurpose } = jsigs.purposes;

/**
 * @typedef {object} VerifiablePresentation Representation of a Verifiable Presentation.
 */

/**
 * @param {object} presentation - An object that could be a presentation.
 * @throws {Error}
 * @private
 */
function checkPresentation(presentation) {
  // Normalize to an array to allow the common case of context being a string
  const context = Array.isArray(presentation['@context'])
    ? presentation['@context'] : [presentation['@context']];

  // Ensure first context is 'https://www.w3.org/2018/credentials/v1'
  if (context[0] !== DEFAULT_CONTEXT_V1_URL) {
    throw new Error(
      `"${DEFAULT_CONTEXT_V1_URL}" needs to be first in the `
      + 'list of contexts.',
    );
  }

  // Ensure VerifiablePresentation exists in types
  const types = jsonld.getValues(presentation, 'type');
  if (!types.includes('VerifiablePresentation')) {
    throw new Error('"type" must include "VerifiablePresentation".');
  }
}

export async function verifyPresentationCredentials(presentation, options = {}) {
  let verified = true;
  let credentialResults = [];

  // Get presentation credentials
  const credentials = jsonld.getValues(presentation, 'verifiableCredential');
  if (credentials.length > 0) {
    // Verify all credentials in list
    credentialResults = await Promise.all(credentials.map((credential) => verifyCredential(credential, { ...options })));

    // Assign credentialId property to all credential results
    for (const [i, credentialResult] of credentialResults.entries()) {
      credentialResult.credentialId = credentials[i].id;
    }

    // Check all credentials passed verification
    const allCredentialsVerified = credentialResults.every((r) => r.verified);
    if (!allCredentialsVerified) {
      verified = false;
    }
  }

  return {
    verified,
    credentialResults,
  };
}

/**
* @typedef {object} VerifiableParams The Options to verify credentials and presentations.
* @property {string} [challenge] - proof challenge Required.
* @property {string} [domain] - proof domain (optional)
* @property {string} [controller] - controller (optional)
* @property {DIDResolver} [resolver] - Resolver to resolve the issuer DID (optional)
* @property {Boolean} [unsignedPresentation] - Whether to verify the proof or not
* @property {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
* @property {Boolean} [forceRevocationCheck] - Whether to force revocation check or not.
* Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
* @property {object} [presentationPurpose] - A purpose other than the default AuthenticationProofPurpose
* @property {object} [revocationApi] - An object representing a map. "revocation type -> revocation API". The API is used to check
* revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [schemaApi] - An object representing a map. "schema type -> schema API". The API is used to get
* a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [documentLoader] - A document loader, can be null and use the default
*/

/**
 * Verify a Verifiable Presentation. Returns the verification status and error in an object
 * @param {object} presentation The verifiable presentation
 * @param {VerifiableParams} options Verify parameters, this object is passed down to jsonld-signatures calls
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function verifyPresentation(presentation, options = {}) {
  if (options.documentLoader && options.resolver) {
    throw new Error('Passing resolver and documentLoader results in resolver being ignored, please re-factor.');
  }

  // Ensure presentation is passed
  if (!presentation) {
    throw new TypeError('"presentation" property is required');
  }

  if (isBBSPlusPresentation(presentation)) {
    return verifyBBSPlusPresentation(presentation, options);
  }

  // Ensure presentation is valid
  checkPresentation(presentation);

  // Extract parameters
  const {
    challenge,
    domain,
    resolver,
    unsignedPresentation = false,
    presentationPurpose,
    controller,
    suite = [],
  } = options;

  // Build verification options
  const verificationOptions = {
    documentLoader: options.documentLoader || defaultDocumentLoader(resolver),
    ...options,
    resolver: null,
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020(), ...suite],
  };

  // TODO: verify proof then credentials
  const { verified, credentialResults } = await verifyPresentationCredentials(presentation, verificationOptions);
  try {
    // Skip proof validation for unsigned
    if (unsignedPresentation) {
      return { verified, results: [presentation], credentialResults };
    }

    // Early out incase credentials arent verified
    if (!verified) {
      return { verified, results: [presentation], credentialResults };
    }

    // Get proof purpose
    if (!presentationPurpose && !challenge) {
      throw new Error(
        'A "challenge" param is required for AuthenticationProofPurpose.',
      );
    }

    // Set purpose and verify
    const purpose = presentationPurpose || new AuthenticationProofPurpose({ controller, domain, challenge });
    const presentationResult = await jsigs.verify(
      presentation, { purpose, ...verificationOptions },
    );

    // Return results
    return {
      presentationResult,
      credentialResults,
      verified: verified && presentationResult.verified,
      error: presentationResult.error,
    };
  } catch (error) {
    // Error occured when verifying presentation, catch and return error
    return {
      verified: false,
      results: [{ verified: false, error }],
      error,
    };
  }
}

/**
 * Sign a Verifiable Presentation
 * @param {object} presentation - the one to be signed
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {string} challenge - proof challenge Required.
 * @param {string} domain - proof domain (optional)
 * @param {DIDResolver} [resolver] - Resolver for DIDs.
 * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @param {object} [presentationPurpose] - Optional presentation purpose to override default AuthenticationProofPurpose
 * @return {Promise<VerifiablePresentation>} A VerifiablePresentation with a proof.
 */
export async function signPresentation(presentation, keyDoc, challenge, domain, resolver = null, compactProof = true, presentationPurpose = null) {
  const suite = getSuiteFromKeyDoc(keyDoc);
  const purpose = presentationPurpose || new AuthenticationProofPurpose({
    domain,
    challenge,
  });

  const documentLoader = defaultDocumentLoader(resolver);
  return jsigs.sign(presentation, {
    purpose, documentLoader, domain, challenge, compactProof, suite,
  });
}

export function isBBSPlusPresentation(presentation) {
  // Since there is no type parameter present we have to guess by checking field types
  // these wont exist in a standard VP
  return typeof presentation.version === 'string' && typeof presentation.proof === 'string' && typeof presentation.spec !== 'undefined' && typeof presentation.spec.credentials !== 'undefined';
}

export async function verifyBBSPlusPresentation(presentation, options = {}) {
  const documentLoader = options.documentLoader || defaultDocumentLoader(options.resolver);

  const keyDocuments = await Promise.all(presentation.spec.credentials.map((c, idx) => {
    const { proof } = c.revealedAttributes;
    if (!proof) {
      throw new Error(`Presentation credential does not reveal its proof for index ${idx}`);
    }
    return Bls12381BBSSignatureDock2022.getVerificationMethod({ proof, documentLoader });
  }));

  const recreatedPres = Presentation.fromJSON(presentation);
  const pks = keyDocuments.map((keyDocument) => {
    const pkRaw = b58.decode(keyDocument.publicKeyBase58);
    return new BBSPlusPublicKeyG2(pkRaw);
  });

  return recreatedPres.verify(pks);
}
