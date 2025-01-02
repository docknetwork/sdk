import {
  CheqdVerificationMethodAssertion,
  CheqdMainnetVerificationMethodAssertion,
  CheqdTestnetVerificationMethodAssertion,
} from './verification-method';
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
  VerificationMethodRef,
} from './verification-method-ref';
import { withFrom } from '../../generic';

export class VerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  VerificationMethodRef,
  (value, from) => {
    try {
      return CheqdVerificationMethodRef.from(value);
    } catch (err) {
      return from(value);
    }
  },
) {}

export class CheqdVerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  CheqdVerificationMethodRef,
  function from(value) {
    try {
      return this.Base.from(value);
    } catch (err) {
      return this.Or.from(value);
    }
  },
) {
  static Base = CheqdVerificationMethodAssertion;

  static Or = CheqdVerificationMethodRef;
}

export class CheqdVerificationMethodRefOrCheqdTestnetVerificationMethod extends CheqdVerificationMethodRefOrCheqdVerificationMethod {
  static Base = CheqdTestnetVerificationMethodAssertion;

  static Or = CheqdTestnetVerificationMethodRef;
}

export class CheqdVerificationMethodRefOrCheqdMainnetVerificationMethod extends CheqdVerificationMethodRefOrCheqdVerificationMethod {
  static Base = CheqdMainnetVerificationMethodAssertion;

  static Or = CheqdMainnetVerificationMethodRef;
}
