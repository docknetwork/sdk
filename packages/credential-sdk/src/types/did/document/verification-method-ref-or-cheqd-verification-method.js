import { VerificationMethodRef } from "./verification-method-ref";
import {
  CheqdMainnetVerificationMethod,
  CheqdTestnetVerificationMethod,
  CheqdVerificationMethod,
} from "./verification-method";
import { withFrom } from "../../generic";

export default class VerificationMethodRefOrCheqdVerificationMethod extends withFrom(
  VerificationMethodRef,
  function fromFn(value, from) {
    try {
      return class CheqdVerificationMethodToJSONString extends this.Base {
        toJSON() {
          return JSON.stringify(JSON.stringify(super.toJSON()));
        }

        static from(obj) {
          return typeof obj === "string"
            ? super.fromJSON(JSON.parse(JSON.parse(obj)))
            : super.from(obj);
        }
      }.from(value);
    } catch (err) {
      return from(value);
    }
  }
) {
  static Base = CheqdVerificationMethod;
}

export class VerificationMethodRefOrCheqdTestnetVerificationMethod extends VerificationMethodRefOrCheqdVerificationMethod {
  static Base = CheqdTestnetVerificationMethod;
}

export class VerificationMethodRefOrCheqdMainnetVerificationMethod extends VerificationMethodRefOrCheqdVerificationMethod {
  static Base = CheqdMainnetVerificationMethod;
}
