import { withQualifier, TypedTuple, TypedNumber } from '../../generic';
import {
  NamespaceDid,
  CheqdNamespaceDid,
  CheqdTestnetDid,
  CheqdMainnetDid,
} from '../onchain/typed-did';

export class VerificationMethodRef extends withQualifier(TypedTuple) {
  static Qualifier = '';

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

  toJSON() {
    return this.toEncodedString();
  }
}

export class CheqdVerificationMethodRef extends VerificationMethodRef {
  static Classes = [CheqdNamespaceDid, TypedNumber];
}

export class CheqdTestnetVerificationMethodRef extends CheqdVerificationMethodRef {
  static Classes = [CheqdTestnetDid, TypedNumber];
}

export class CheqdMainnetVerificationMethodRef extends CheqdVerificationMethodRef {
  static Classes = [CheqdMainnetDid, TypedNumber];
}
