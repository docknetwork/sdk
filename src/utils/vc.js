import { createPresentation, signPresentation, verifyPresentation } from './vc/presentations';
import { issueCredential, verifyCredential } from './vc/credentials';

import {
  isRevocationCheckNeeded,
  checkRevocationStatus,
  getCredentialStatuses,
  getDockRevIdFromCredential,
} from './revocation';

import { validateCredentialSchema } from './vc/schema';
import { expandJSONLD } from './vc/helpers';

import {
  RevRegType,
  DockRevRegQualifier,
  DEFAULT_TYPE,
  DEFAULT_CONTEXT,
} from './vc/constants';

/**
 * @typedef {object} VerifiablePresentation Representation of a Verifiable Presentation.
 */

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
 * Check that credential is verified, i.e. the credential has VCDM compliant structure and the `proof`
 * (signature by issuer) is correct.
 * @param {object} [credential] The credential to verify
 * @param {object} [params] Verify parameters (TODO: add type info for this object)
 * @returns {Promise<boolean>} Returns promise that resolves to true if credential is valid and not revoked and false otherwise
 */
export async function isVerifiedCredential(credential, params) {
  const result = await verifyCredential(credential, params);
  return result.verified;
}

/**
 * Check that presentation is verified, i.e. the presentation and credentials have VCDM compliant structure and
 * the `proof` (signature by holder) is correct.
 * @param {object} [params] Verify parameters (TODO: add type info for this object)
 * @returns {Promise<boolean>} - Returns promise that resolves to true if the
 * presentation is valid and all the credentials are valid and not revoked and false otherwise. The `error` will
 * describe the error if any.
 */
export async function isVerifiedPresentation(presentation, params) {
  const result = await verifyPresentation(presentation, params);
  return result.verified;
}

/**
 * Return `credentialStatus` according to W3C spec when the revocation status is checked on Dock
 * @param registryId - Revocation registry id
 * @returns {{id: string, type: string}}
 */
export function buildDockCredentialStatus(registryId) {
  return { id: `${DockRevRegQualifier}${registryId}`, type: RevRegType };
}

export {
  expandJSONLD,
  verifyCredential,
  issueCredential,
  createPresentation,
  signPresentation,
  verifyPresentation,
  isRevocationCheckNeeded,
  checkRevocationStatus,
  getCredentialStatuses,
  validateCredentialSchema,
  getDockRevIdFromCredential,
  DEFAULT_TYPE,
  DEFAULT_CONTEXT,
};
