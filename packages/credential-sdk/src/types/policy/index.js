import { TypedEnum } from '../generic';
import OneOfPolicyValue from './one-of-policy-value';

export class Policy extends TypedEnum {}
export class OneOfPolicy extends Policy {
  static Class = OneOfPolicyValue;

  addOwner(ownerDID) {
    return this.value.addOwner(ownerDID);
  }
}

Policy.bindVariants(OneOfPolicy);
