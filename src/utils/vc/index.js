import { signPresentation, verifyPresentation } from './presentations';
import { issueCredential, verifyCredential } from './credentials';
import { expandJSONLD } from './helpers';

import {
  DEFAULT_TYPE,
  DEFAULT_CONTEXT,
} from './constants';

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

// TODO: export more methods supplied in revocation/credentials
export {
  expandJSONLD,
  verifyCredential,
  issueCredential,
  signPresentation,
  verifyPresentation,
  DEFAULT_TYPE,
  DEFAULT_CONTEXT,
};
