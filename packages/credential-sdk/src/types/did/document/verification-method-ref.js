import {
  withQualifier,
  TypedTuple,
  TypedNumber,
  createConverter,
} from "../../generic";
import {
  NamespaceDid,
  CheqdNamespaceDid,
  CheqdTestnetDid,
  CheqdMainnetDid,
  DockNamespaceDid,
} from "../onchain/typed-did";

export class VerificationMethodRef extends withQualifier(TypedTuple) {
  static Qualifier = "";

  static Classes = [NamespaceDid, TypedNumber];

  get did() {
    return this[0];
  }

  get index() {
    return this[1];
  }

  static fromUnqualifiedString(str) {
    const regex = new RegExp(`^${this.Qualifier}([^#]+)#keys-(\\d+)$`);
    const match = str.match(regex);

    if (!match) {
      throw new Error(`Invalid format for VerificationMethodRef: \`${str}\``);
    }

    const [, did, index] = match;
    return new this(did, parseInt(index, 10));
  }

  toEncodedString() {
    const { did, index } = this;

    return `${did}#keys-${index}`;
  }

  toCheqdPayload() {
    return this.toEncodedString();
  }

  toJSON() {
    return this.toEncodedString();
  }
}

export class CheqdVerificationMethodRef extends VerificationMethodRef {
  static Classes = [CheqdNamespaceDid, TypedNumber];
}

export class DockVerificartionMethodRef extends VerificationMethodRef {
  static Classes = [DockNamespaceDid, TypedNumber];
}

export class CheqdTestnetVerificationMethodRef extends CheqdVerificationMethodRef {
  static Classes = [CheqdTestnetDid, TypedNumber];
}

export class CheqdMainnetVerificationMethodRef extends CheqdVerificationMethodRef {
  static Classes = [CheqdMainnetDid, TypedNumber];
}

/**
 * Retrieve all possible stringified representations of DIDs that can be derived from the provided Dock verification method reference.
 *
 * @param {*} verMethodRef
 * @returns {Array<string>}
 */
export const possibleVerificationMethodRefs = createConverter(
  String,
  DockVerificartionMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdMainnetVerificationMethodRef
);
