import assert from 'assert';

// todo: dont like this file or assert import

/**
 * Error thrown when a DID document lookup was successful, but the did in question does not exist.
 * This is different from a network error.
 */
class NoDID extends Error {
  constructor(did) {
    assert(did !== undefined);
    super(`${did} does not exist`);
    this.name = "NoDID";
    this.did = did;
  }
}

export {
  NoDID
};
