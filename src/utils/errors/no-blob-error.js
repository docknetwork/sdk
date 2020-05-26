/**
 * Error thrown when a Blob lookup was successful, but the Blob in question does not exist.
 * This is different from a network error.
 */
export default class NoBlobError extends Error {
  constructor(id) {
    super(`Blob ID (${id}) does not exist`);
    this.name = 'NoBlobError';
    this.id = id;
  }
}
