import {
  CheqdVerificationMethodAssertion,
  CheqdMainnetVerificationMethodAssertion,
  CheqdTestnetVerificationMethodAssertion,
  CheqdVerificationMethodAssertionLegacy,
  CheqdTestnetVerificationMethodAssertionLegacy,
} from './verification-method';
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
} from './verification-method-ref';
import { withFrom } from '../../generic';

export class CheqdVerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  CheqdVerificationMethodRef,
  function from(value) {
    try {
      return this.First.from(value);
    } catch (firstErr) {
      try {
        return this.Second.from(value);
      } catch (secondErr) {
        secondErr.message = `${firstErr.message}; ${secondErr.message}`;

        if (this.Third == null) {
          throw secondErr;
        }
        try {
          return this.Third.from(value);
        } catch (thirdErr) {
          thirdErr.message = `${secondErr.message}; ${thirdErr.message}`;

          throw thirdErr;
        }
      }
    }
  },
) {
  static First = CheqdVerificationMethodAssertion;

  static Second = CheqdVerificationMethodAssertionLegacy;

  static Third = CheqdVerificationMethodRef;
}

export class CheqdVerificationMethodRefOrCheqdTestnetVerificationMethod extends CheqdVerificationMethodRefOrCheqdVerificationMethod {
  static First = CheqdTestnetVerificationMethodAssertion;

  static Second = CheqdTestnetVerificationMethodAssertionLegacy;

  static Third = CheqdTestnetVerificationMethodRef;
}

export class CheqdVerificationMethodRefOrCheqdMainnetVerificationMethod extends CheqdVerificationMethodRefOrCheqdVerificationMethod {
  static First = CheqdMainnetVerificationMethodAssertion;

  static Second = CheqdMainnetVerificationMethodRef;
}
