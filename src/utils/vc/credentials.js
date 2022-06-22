import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import CredentialIssuancePurpose from './CredentialIssuancePurpose';
import defaultDocumentLoader from './document-loader';
import { getAndValidateSchemaIfPresent } from './schema';
import { isRevocationCheckNeeded, checkRevocationStatus } from '../revocation';
import DIDResolver from '../../did-resolver'; // eslint-disable-line

import { getSuiteFromKeyDoc, expandJSONLD } from './helpers';
import { DEFAULT_CONTEXT_V1_URL, credentialContextField } from './constants';
import { ensureValidDatetime } from '../type-helpers';

import {
  EcdsaSepc256k1Signature2019, Ed25519Signature2018, Sr25519Signature2020,
} from './custom_crypto';

/**
 * @param {string|object} obj - Object with ID property or a string
 * @returns {string|undefined} Object's id property or the initial string value
 * @private
 */
function getId(obj) {
  if (!obj) {
    return undefined;
  }
  if (typeof obj === 'string') {
    return obj;
  }
  return obj.id;// || 'dock:did:' + String(obj);
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredentialJSONLD(credential) {
  // Ensure VerifiableCredential is listed in credential types
  if (!jsonld.getValues(credential, 'type').includes('VerifiableCredential')) {
    throw new Error('"type" must include `VerifiableCredential`.');
  }

  // Ensure issuanceDate cardinality
  if (jsonld.getValues(credential, 'issuanceDate').length > 1) {
    throw new Error('"issuanceDate" property can only have one value.');
  }

  // Ensure issuer cardinality
  if (jsonld.getValues(credential, 'issuer').length > 1) {
    throw new Error('"issuer" property can only have one value.');
  }

  // Ensure evidences are URIs
  jsonld.getValues(credential, 'evidence').forEach((evidence) => {
    const evidenceId = getId(evidence);
    if (evidenceId && !evidenceId.includes(':')) {
      throw new Error(`"evidence" id must be a URL: ${evidence}`);
    }
  });
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredentialRequired(credential) {
  // Ensure first context is DEFAULT_CONTEXT_V1_URL
  if (credential['@context'][0] !== DEFAULT_CONTEXT_V1_URL) {
    throw new Error(`"${DEFAULT_CONTEXT_V1_URL}" needs to be first in the contexts array.`);
  }

  // Ensure type property exists
  if (!credential.type) {
    throw new Error('"type" property is required.');
  }

  // Ensure credential has subject
  if (!credential.credentialSubject) {
    throw new Error('"credentialSubject" property is required.');
  }

  // Ensure issuer is valid
  const issuer = getId(credential.issuer);
  if (!issuer) {
    throw new Error(`"issuer" must be an object with ID property or a string. Got: ${credential.issuer}`);
  } else if (!issuer.includes(':')) {
    throw new Error('"issuer" id must be in URL format.');
  }

  // Ensure there is an issuance date, if exists
  if (!credential.issuanceDate) {
    throw new Error('"issuanceDate" property is required.');
  } else {
    ensureValidDatetime(credential.issuanceDate);
  }
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredentialOptional(credential) {
  // Ensure credential status is valid, if exists
  if ('credentialStatus' in credential) {
    if (!credential.credentialStatus.id) {
      throw new Error('"credentialStatus" must include an id.');
    }
    if (!credential.credentialStatus.type) {
      throw new Error('"credentialStatus" must include a type.');
    }
  }

  // Ensure expiration date is valid, if exists
  if ('expirationDate' in credential) {
    ensureValidDatetime(credential.expirationDate);
  }
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 */
export function checkCredential(credential) {
  checkCredentialRequired(credential);
  checkCredentialOptional(credential);
  checkCredentialJSONLD(credential);
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
* @property {object} [purpose] - A purpose other than the default CredentialIssuancePurpose
* @property {object} [revocationApi] - An object representing a map. "revocation type -> revocation API". The API is used to check
* revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [schemaApi] - An object representing a map. "schema type -> schema API". The API is used to get
* a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [documentLoader] - A document loader, can be null and use the default
*/

/**
 * Verify a Verifiable Credential. Returns the verification status and error in an object
 * @param {object} [credential] The VCDM Credential
 * @param {VerifiableParams} options Verify parameters, this object is passed down to jsonld-signatures calls
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * credential is valid and not revoked and false otherwise. The `error` will describe the error if any.
 */
// TODO: perform verification on the expanded JSON-LD credential
export async function verifyCredential(credential, {
  resolver = null,
  compactProof = true,
  forceRevocationCheck = true,
  revocationApi = null,
  schemaApi = null,
  documentLoader = null,
  purpose = null,
  controller = null,
} = {}) {
  if (documentLoader && resolver) {
    throw new Error('Passing resolver and documentLoader results in resolver being ignored, please re-factor.');
  }

  if (!credential) {
    throw new TypeError(
      'A "credential" property is required for verifying.',
    );
  }

  // Set document loader
  const docLoader = documentLoader || defaultDocumentLoader(resolver);

  // Check credential is valid
  checkCredential(credential);

  // Expand credential JSON-LD
  const expandedCredential = await expandJSONLD(credential, {
    documentLoader: docLoader,
  });

  // Validate scheam
  if (schemaApi) {
    await getAndValidateSchemaIfPresent(expandedCredential, schemaApi, credential[credentialContextField]);
  }

  // Verify with jsonld-signatures
  const result = await jsigs.verify(credential, {
    purpose: purpose || new CredentialIssuancePurpose({
      controller,
    }),
    // TODO: support more key types, see digitalbazaar github
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    documentLoader: docLoader,
    compactProof,
  });

  // Check for revocation only if the credential is verified and revocation check is needed.
  if (result.verified && isRevocationCheckNeeded(expandedCredential, forceRevocationCheck, revocationApi)) {
    const revResult = await checkRevocationStatus(expandedCredential, revocationApi);

    // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
    if (!revResult.verified) {
      return revResult;
    }
  }
  return result;
}

/**
 * Issue a Verifiable credential
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {object} credential - Credential to be signed.
 * @param {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
 * @param {object} [issuerObject] - Optional issuer object to assign
 * @return {Promise<object>} The signed credential object.
 */
export async function issueCredential(keyDoc, credential, compactProof = true, documentLoader = null, purpose = null, expansionMap = null, issuerObject = null) {
  // Get suite from keyDoc parameter
  const suite = getSuiteFromKeyDoc(keyDoc);
  if (!suite.verificationMethod) {
    throw new TypeError('"suite.verificationMethod" property is required.');
  }

  // Clone the credential object to prevent mutation
  const issuerId = credential.issuer || keyDoc.controller;
  const cred = {
    ...credential,
    issuer: issuerObject ? {
      ...issuerObject,
      id: issuerId,
    } : issuerId,
  };

  // Ensure credential is valid
  checkCredential(cred);

  // Sign and return the credential
  return jsigs.sign(cred, {
    purpose: purpose || new CredentialIssuancePurpose(),
    documentLoader: documentLoader || defaultDocumentLoader(),
    suite,
    compactProof,
    expansionMap,
  });
}
