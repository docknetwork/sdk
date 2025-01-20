import {
  CheqdVerificationMethodAssertion,
  CheqdMainnetVerificationMethodAssertion,
  CheqdTestnetVerificationMethodAssertion,
} from "./verification-method";
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
} from "./verification-method-ref";
import { withFrom } from "../../generic";

export class CheqdVerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  CheqdVerificationMethodRef,
  function from(value) {
    try {
      return this.Base.from(value);
    } catch (err) {
      return this.Or.from(value);
    }
  }
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
