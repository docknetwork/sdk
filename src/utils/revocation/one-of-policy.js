import { getHexIdentifierFromDID } from '../did';

// Revocation policy that allows one of the pre-decided controllers to update the registry.
export default class OneOfPolicy {
  constructor(controllers) {
    if (controllers === undefined) {
      this.controllers = new Set();
    } else {
      this.controllers = controllers;
    }
  }

  /**
   * Add a owner to the policy
   * @param ownerDID
   */
  addOwner(ownerDID) {
    this.controllers.add(ownerDID);
  }

  toJSON() {
    return {
      // Convert each onwer DID to hex identifier if not already
      OneOf: new Set([...this.controllers].map(getHexIdentifierFromDID)),
    };
  }
}
