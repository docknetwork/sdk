import { encodeAddress, randomAsHex } from '@polkadot/util-crypto';
import { DockBlobByteSize, DockBlobQualifier } from '../modules/blob';
import { isObject } from './type-helpers';


/**
 * Error thrown when a Blob lookup was successful, but the Blob in question does not exist.
 * This is different from a network error.
 */
export class NoBlobError extends Error {
  constructor(blob) {
    super(`Blob (${blob}) does not exist`);
    this.name = 'NoBlobError';
    this.blob = blob;
  }
}

/**
 * Create and return a fully qualified Dock Blob, i.e. "did:dock:<SS58 string>"
 * @returns {string} - The Blob
 */
export function createNewDockBlobId() {
  const hexId = randomAsHex(DockBlobByteSize);
  const ss58Id = encodeAddress(hexId);
  return `${DockBlobQualifier}${ss58Id}`;
}
