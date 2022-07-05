import { randomAsHex, blake2AsHex } from '@polkadot/util-crypto';
import jsonld from 'jsonld';

import OneOfPolicy from './revocation/one-of-policy';
import { isHexWithGivenByteSize } from './codec';

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
 * Checks if the revocation check is needed. Will return true if `forceRevocationCheck` is true else will check the
 * truthyness of revocationApi. Will return true even if revocationApi is an empty object.
 * @param {object} credential - The expanded credential to be checked.
 * @param {boolean} forceRevocationCheck - Whether to force the revocation check.
 * Warning, setting forceRevocationCheck to false can allow false positives when verifying revocable credentials.
 * @param {object} revocationApi - See above verification methods for details on this parameter
 * @returns {boolean} - Whether to check for revocation or not.
 */
export function isRevocationCheckNeeded(credential, forceRevocationCheck, revocationApi) {
  return !!credential[expandedStatusProperty] && (forceRevocationCheck || !!revocationApi);
}

/**
 * Checks if a credential has a credentialStatus property and it has the properties we expect
 * @param expanded
 */
export async function getCredentialStatuses(expanded) {
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
 * Check if a credential status has a Dock specific revocation
 * @param status
 * @returns {Boolean}
 */
function hasDockRevocation(status) {
  const id = status[credentialIDField];
  if (status
    && (
      jsonld.getValues(status, credentialTypeField).includes(RevRegType)
      || jsonld.getValues(status, credentialTypeField).includes(`/${RevRegType}`)
    )
    && id.startsWith(DockRevRegQualifier)
    && isHexWithGivenByteSize(id.slice(DockRevRegQualifier.length), RevRegIdByteSize)) {
    return true;
  }

  return false;
}

/**
 * Check if the credential is revoked or not.
 * @param credential
 * @param revocationApi
 * @returns {Promise<{verified: boolean}|{verified: boolean, error: string}>} The returned object will have a key `verified`
 * which is true if the credential is not revoked and false otherwise. The `error` will describe the error if any.
 */
export async function checkRevocationStatus(credential, revocationApi) {
  if (!revocationApi) {
    throw new Error('No revocation API supplied');
  } else if (!revocationApi.dock) {
    throw new Error('Only Dock revocation support is present as of now.');
  } else {
    const statuses = await getCredentialStatuses(credential);
    const dockAPI = revocationApi.dock;
    const revId = getDockRevIdFromCredential(credential);
    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];

      if (!hasDockRevocation(status)) {
        return { verified: false, error: 'The credential status does not have the format required by Dock' };
      }

      const regId = status[credentialIDField].slice(DockRevRegQualifier.length);

      // Hash credential id to get revocation id
      const revocationStatus = await dockAPI.revocation.getIsRevoked(regId, revId); // eslint-disable-line
      if (revocationStatus) {
        return { verified: false, error: 'Revocation check failed' };
      }
    }

    return { verified: true };
  }
}

export {
  OneOfPolicy,
  RevRegType,
  DockRevRegQualifier,
};
