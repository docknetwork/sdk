import {
  withQualifier,
  TypedTuple,
  TypedNumber,
  createConverter,
  TypedString,
} from '../../generic';
import {
  NamespaceDid,
  CheqdNamespaceDid,
  CheqdTestnetDid,
  CheqdMainnetDid,
  DockNamespaceDid,
} from '../onchain/typed-did';

export class VerificationMethodRef extends withQualifier(TypedTuple) {
  static Qualifier = '';

  static Classes = [NamespaceDid, TypedNumber, TypedString];

  get did() {
    return this[0];
  }

  get index() {
    return this[1];
  }

  get keyIdentifier() {
    return this[2] || 'keys';
  }

  constructor(did, index, keyIdentifier = 'keys') {
    super(did, index, keyIdentifier);
  }

  static fromUnqualifiedString(str) {
    const regex = new RegExp(`^${this.Qualifier}([^#]+)#([^\\-]+)-(\\d+)$`);
    const match = str.match(regex);

    if (!match) {
      throw new Error(`Invalid format for VerificationMethodRef: \`${str}\``);
    }

    const [, did, keyIdentifier, index] = match;
    return new this(did, parseInt(index, 10), keyIdentifier);
  }

  toEncodedString() {
    const { did, index, keyIdentifier } = this;

    return `${did}#${keyIdentifier}-${index}`;
  }

  toCheqdPayload() {
    return this.toEncodedString();
  }

  toJSON() {
    return this.toEncodedString();
  }
}

export class CheqdVerificationMethodRef extends VerificationMethodRef {
  static Classes = [CheqdNamespaceDid, TypedNumber, TypedString];
}

export class DockVerificartionMethodRef extends VerificationMethodRef {
  static Classes = [DockNamespaceDid, TypedNumber, TypedString];
}

export class CheqdTestnetVerificationMethodRef extends CheqdVerificationMethodRef {
  static Classes = [CheqdTestnetDid, TypedNumber, TypedString];
}

export class CheqdMainnetVerificationMethodRef extends CheqdVerificationMethodRef {
  static Classes = [CheqdMainnetDid, TypedNumber, TypedString];
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
  CheqdMainnetVerificationMethodRef,
);
