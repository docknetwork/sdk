import VerificationMethodRef from './verification-method-ref';
import { CheqdVerificationMethod } from './verification-method';
import { withFrom } from '../../generic';

export default class VerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  VerificationMethodRef,
  (value, from) => {
    try {
      return class CheqdVerificationMethodToJSONString extends CheqdVerificationMethod {
        toJSON() {
          return JSON.stringify(JSON.stringify(super.toJSON()));
        }

        static from(obj) {
          return typeof obj === 'string' ? super.fromJSON(JSON.parse(JSON.parse(obj))) : super.from(obj);
        }
      }.from(value);
    } catch {
      return from(value);
    }
  },
) {}
