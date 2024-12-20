import {
  CheqdVerificationMethodAssertion,
  CheqdMainnetVerificationMethodAssertion,
  CheqdTestnetVerificationMethodAssertion,
} from "./verification-method";
import { VerificationMethodRef } from "./verification-method-ref";
import { withFrom } from "../../generic";

export default class VerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  VerificationMethodRef,
  function from(value, fromFn) {
    try {
      return this.Base.from(value);
    } catch (err) {
      return fromFn(value);
    }
  }
) {
  static Base = CheqdVerificationMethodAssertion;
}

export class VerificationMethodRefOrCheqdTestnetVerificationMethod extends VerificationMethodRefOrCheqdVerificationMethod {
  static Base = CheqdTestnetVerificationMethodAssertion;
}

export class VerificationMethodRefOrCheqdMainnetVerificationMethod extends VerificationMethodRefOrCheqdVerificationMethod {
  static Base = CheqdMainnetVerificationMethodAssertion;
}
