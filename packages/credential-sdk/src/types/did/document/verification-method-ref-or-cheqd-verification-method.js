import VerificationMethodRef from "./verification-method-ref";
import { CheqdVerificationMethodAssertion } from "./verification-method";
import { withFrom } from "../../generic";

export default class VerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  VerificationMethodRef,
  (value, from) => {
    try {
      return CheqdVerificationMethodAssertion.from(value);
    } catch {
      return from(value);
    }
  }
) {}
