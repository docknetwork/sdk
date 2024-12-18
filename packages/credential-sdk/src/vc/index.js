import { verifyPresentation } from './presentations';
import { verifyCredential } from './credentials';

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

export { default as Presentation } from './presentation';
export { default as VerifiableCredential } from './verifiable-credential';
export { default as VerifiablePresentation } from './verifiable-presentation';
export { default as StatusList2021Credential } from './status-list2021-credential';
export { default as PrivateStatusList2021Credential } from './private-status-list2021-credential';
export * from './credentials';
export * from './helpers';
export * from './schema';
export * from './constants';
export { default as CredentialIssuancePurpose } from './CredentialIssuancePurpose';
export { default as documentLoader } from './document-loader';
export * from './jws';
export * from './presentations';
export * from './revocation';
export * from './crypto';
