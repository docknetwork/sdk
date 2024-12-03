import { TypedEnum } from '../generic';
import OneOfPolicyValue from './one-of-policy-value';

export class Policy extends TypedEnum {}
export class OneOfPolicy extends Policy {
  static Class = OneOfPolicyValue;

  /**
   * Add a owner to the policy
   * @param {*} ownerDID - Owner's DID
   */
  addOwner(ownerDID) {
    return this.value.add(ownerDID);
  }
}

Policy.bindVariants(OneOfPolicy);
