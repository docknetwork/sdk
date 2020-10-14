import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import CredentialIssuancePurpose from './CredentialIssuancePurpose';
import defaultDocumentLoader from './document-loader';
import { getAndValidateSchemaIfPresent } from './schema';
import { isRevocationCheckNeeded, checkRevocationStatus } from '../revocation';

import { getSuiteFromKeyDoc, expandJSONLD } from './helpers';

import { credentialContextField } from './constants';

import {
  EcdsaSepc256k1Signature2019, Ed25519Signature2018, Sr25519Signature2020,
} from './custom_crypto';

const { constants: { CREDENTIALS_CONTEXT_V1_URL } } = require('credentials-context');

// TODO: use utils for this
const dateRegex = new RegExp('^(\\d{4})-(0[1-9]|1[0-2])-'
    + '(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):'
    + '([0-5][0-9]):([0-5][0-9]|60)'
    + '(\\.[0-9]+)?(Z|(\\+|-)([01][0-9]|2[0-3]):'
    + '([0-5][0-9]))$', 'i');

/**
 * @param {string|object} obj - Either an object with an id property
 *   or a string that is an id.
 * @returns {string|undefined} Either an id or undefined.
 * @private
 *
 */
export function getId(obj) {
  if (typeof obj === 'string') {
    return obj;
  }

  if (!('id' in obj)) {
    return undefined;
  }

  return obj.id;
}

export function checkCredentialJSONLD(credential) {
  if (!jsonld.getValues(credential, 'type').includes('VerifiableCredential')) {
    throw new Error('"type" must include `VerifiableCredential`.');
  }

  // check issuanceDate cardinality
  if (jsonld.getValues(credential, 'issuanceDate').length > 1) {
    throw new Error('"issuanceDate" property can only have one value.');
  }

  // check issuer cardinality
  if (jsonld.getValues(credential, 'issuer').length > 1) {
    throw new Error('"issuer" property can only have one value.');
  }

  // check evidences are URLs
  // FIXME
  jsonld.getValues(credential, 'evidence').forEach((evidence) => {
    const evidenceId = getId(evidence);
    if (evidenceId && !evidenceId.includes(':')) {
      throw new Error(`"evidence" id must be a URL: ${evidence}`);
    }
  });
}

export function checkCredentialRequired(credential) {
  // ensure first context is 'https://www.w3.org/2018/credentials/v1'
  if (credential['@context'][0] !== CREDENTIALS_CONTEXT_V1_URL) {
    throw new Error(
      `"${CREDENTIALS_CONTEXT_V1_URL}" needs to be first in the `
      + 'list of contexts.',
    );
  }

  // check type presence and cardinality
  if (!credential.type) {
    throw new Error('"type" property is required.');
  }

  if (!credential.credentialSubject) {
    throw new Error('"credentialSubject" property is required.');
  }

  if (!credential.issuer) {
    throw new Error('"issuer" property is required.');
  }

  // check issued is a date
  if (!credential.issuanceDate) {
    throw new Error('"issuanceDate" property is required.');
  }
}

export function checkCredentialOptional(credential) {
  if ('issuanceDate' in credential && !dateRegex.test(credential.issuanceDate)) {
    throw new Error(
      `"issuanceDate" must be a valid date: ${credential.issuanceDate}`,
    );
  }

  // check issuer is a URL
  // FIXME
  if ('issuer' in credential) {
    const issuer = getId(credential.issuer);
    if (!issuer) {
      throw new Error('"issuer" id is required.');
    }
    if (!issuer.includes(':')) {
      throw new Error(`"issuer" id must be a URL: ${issuer}`);
    }
  }

  if ('credentialStatus' in credential) {
    if (!credential.credentialStatus.id) {
      throw new Error('"credentialStatus" must include an id.');
    }
    if (!credential.credentialStatus.type) {
      throw new Error('"credentialStatus" must include a type.');
    }
  }

  // check expires is a date
  if ('expirationDate' in credential
      && !dateRegex.test(credential.expirationDate)) {
    throw new Error(
      `"expirationDate" must be a valid date: ${credential.expirationDate}`,
    );
  }
}

/**
 * @param {object} credential - An object that could be a VerifiableCredential.
 * @throws {Error}
 * @private
 */
export function checkCredential(credential) {
  checkCredentialRequired(credential);
  checkCredentialOptional(credential);
  checkCredentialJSONLD(credential);
}

async function verifyVCDM(credential, options = {}) {
  // run common credential checks
  checkCredential(credential);

  const documentLoader = options.documentLoader || defaultDocumentLoader;

  const { controller } = options;
  const purpose = options.purpose || new CredentialIssuancePurpose({
    controller,
  });

  const result = await jsigs.verify(
    credential, { purpose, documentLoader, ...options },
  );

  // if verification has already failed, skip status check
  if (!result.verified) {
    return result;
  }

  return result;
}

/**
* @typedef {object} VerifiableParams The Options to verify credentials and presentations.
* @property {string} [challenge] - proof challenge Required.
* @property {string} [domain] - proof domain (optional)
* @property {DIDResolver} [resolver] - Resolver to resolve the issuer DID (optional)
* @property {Boolean} [compactProof] - Whether to compact the JSON-LD or not.
* @property {Boolean} [forceRevocationCheck] - Whether to force revocation check or not.
* Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
* @property {object} [revocationApi] - An object representing a map. "revocation type -> revocation API". The API is used to check
* revocation status. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
* @property {object} [schemaApi] - An object representing a map. "schema type -> schema API". The API is used to get
* a schema doc. For now, the object specifies the type as key and the value as the API, but the structure can change
* as we support more APIs there are more details associated with each API. Only Dock is supported as of now.
*/

/**
 * Verify a Verifiable Credential. Returns the verification status and error in an object
 * @param {object} [credential] The VCDM Credential
 * @param {VerifiableParams} Verify parameters
 * @return {Promise<object>} verification result. The returned object will have a key `verified` which is true if the
 * credential is valid and not revoked and false otherwise. The `error` will describe the error if any.
 */
export async function verifyCredential(credential, {
  resolver = null, compactProof = true, forceRevocationCheck = true, revocationApi = null, schemaApi = null, documentLoader = null,
} = {}) {
  if (!credential) {
    throw new TypeError(
      'A "credential" property is required for verifying.',
    );
  }

  // Check credential is valid
  checkCredential(credential);

  // Expand credential JSON-LD
  const expandedCredential = await expandJSONLD(credential);

  // Validate scheam
  if (schemaApi) {
    await getAndValidateSchemaIfPresent(expandedCredential, schemaApi, credential[credentialContextField]);
  }

  // Run VCJS verifier
  let credVer;
  const veroptions = {
    suite: [new Ed25519Signature2018(), new EcdsaSepc256k1Signature2019(), new Sr25519Signature2020()],
    documentLoader: documentLoader || defaultDocumentLoader(resolver),
    compactProof,
  };
  try {
    credVer = await verifyVCDM(credential, veroptions);
  } catch (error) {
    credVer = {
      verified: false,
      results: [{ credential, verified: false, error }],
      error,
    };
  }

  // Check for revocation only if the credential is verified and revocation check is needed.
  if (credVer.verified && isRevocationCheckNeeded(expandedCredential, forceRevocationCheck, revocationApi)) {
    const revResult = await checkRevocationStatus(expandedCredential, revocationApi);

    // If revocation check fails, return the error else return the result of credential verification to avoid data loss.
    if (!revResult.verified) {
      return revResult;
    }
  }
  return credVer;
}

/**
 * Issue a Verifiable credential
 * @param {object} keyDoc - key document containing `id`, `controller`, `type`, `privateKeyBase58` and `publicKeyBase58`
 * @param {object} credential - Credential to be signed.
 * @param {Boolean} compactProof - Whether to compact the JSON-LD or not.
 * @return {Promise<object>} The signed credential object.
 */
export async function issueCredential(keyDoc, credential, compactProof = true, documentLoader = null, purpose = null, expansionMap = null) {
  if (!keyDoc) {
    throw new TypeError('"keyDoc" parameter is required for issuing.');
  }

  if (!credential) {
    throw new TypeError('"credential" parameter is required for issuing.');
  }

  const suite = getSuiteFromKeyDoc(keyDoc);
  if (!suite.verificationMethod) {
    throw new TypeError('"suite.verificationMethod" property is required.');
  }

  // The following code (including `issue` method) will modify the passed credential so clone it.gb
  const cred = { ...credential };
  if (keyDoc.controller) {
    cred.issuer = keyDoc.controller;
  }

  checkCredential(cred);

  return jsigs.sign(cred, {
    purpose: purpose || new CredentialIssuancePurpose(),
    documentLoader: documentLoader || defaultDocumentLoader(),
    suite,
    compactProof,
    expansionMap,
  });
}
