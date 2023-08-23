import { randomAsHex, blake2AsHex } from '@polkadot/util-crypto';
import jsonld from 'jsonld';

import OneOfPolicy from './revocation/one-of-policy';

import {
  RevRegType,
  DockRevRegQualifier,
  expandedStatusProperty,
  credentialIDField,
  credentialTypeField,
} from './vc/constants';

// The revocation registry has id with the byte size `RevRegIdByteSize`
export const RevRegIdByteSize = 32;
// Each entry in revocation registry has byte size `RevEntryByteSize`
export const RevEntryByteSize = 32;

/**
 * Return `credentialStatus` according to W3C spec when the revocation status is checked on Dock
 * @param registryId - Revocation registry id
 * @returns {{id: string, type: string}}
 */
export function buildDockCredentialStatus(registryId) {
  return { id: `${DockRevRegQualifier}${registryId}`, type: RevRegType };
}

/**
 * Generate the revocation id of a credential usable by Dock. It hashes the credential id to get the
 * revocation id
 * @param credential
 * @returns {*}
 */
export function getDockRevIdFromCredential(credential) {
  // The hash outputs the same number of bytes as required by Dock
  return blake2AsHex(credential[credentialIDField], RevEntryByteSize * 8);
}

/**
 * Generate a random revocation registry id.
 * @returns {string} The id as a hex string
 */
export function createRandomRegistryId() {
  return randomAsHex(RevRegIdByteSize);
}

/**
 * Checks if a credential has a credentialStatus property and it has the properties we expect
 * @param expanded
 */
export function getCredentialStatuses(expanded) {
  const statusValues = jsonld.getValues(expanded, expandedStatusProperty);
  statusValues.forEach((status) => {
    if (!status[credentialIDField]) {
      throw new Error('"credentialStatus" must include an id.');
    }
    if (!status[credentialTypeField]) {
      throw new Error('"credentialStatus" must include a type.');
    }
  });

  return statusValues;
}

/**
 * Returns `true` if supplied status is a registry revocation status.
 * @param status
 * @returns {boolean}
 */
export const isRegistryRevocationStatus = ({ [credentialTypeField]: type }) => type.includes(RevRegType) || type.includes(`/${RevRegType}`);

/**
 * Checks if a credential status has a registry revocation.
 * @param expanded
 * @returns {boolean}
 */
export function hasRegistryRevocationStatus(expanded) {
  return !!getCredentialStatuses(expanded).find(isRegistryRevocationStatus);
}

/**
 * Check if the credential is revoked or not according to the revocation registry mechanism.
 * @param credential
 * @param documentLoader
 * @returns {Promise<{verified: boolean}|{verified: boolean, error: string}>} The returned object will have a key `verified`
 * which is true if the credential is not revoked and false otherwise. The `error` will describe the error if any.
 */
export async function checkRevocationRegistryStatus(
  credential,
  documentLoader,
) {
  const statuses = await getCredentialStatuses(credential);
  const revId = getDockRevIdFromCredential(credential);
  if (statuses.length !== 1) {
    throw new Error(
      `\`statusPurpose\` must be an array containing a single item, received: \`${credential[expandedStatusProperty]}\``,
    );
  }

  const [status] = statuses;
  if (!isRegistryRevocationStatus(status)) {
    throw new Error(`Expected registry revocation status, got \`${status}\``);
  }

  const regId = status[credentialIDField];
  const fullId = `${regId}#${revId}`;

  // Hash credential id to get revocation id
  const { document: revocationStatus } = await documentLoader(fullId);
  if (revocationStatus) {
    return { verified: false, error: 'Revocation check failed' };
  }

  return { verified: true };
}

export { OneOfPolicy, RevRegType, DockRevRegQualifier };
