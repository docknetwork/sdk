import {
  TypedEnum, TypedStruct, withQualifier, withBase58btc,
} from '../../../../generic';
import {
  PublicKeyEd25519Value,
  PublicKeySecp256k1Value,
} from '../../../../public-keys';
import {
  DidMethodKeyBytePrefixEd25519,
  DidMethodKeyBytePrefixSecp256k1,
  Ed25519PublicKeyPrefix,
  Secp256k1PublicKeyPrefix,
} from '../../constants';
import DidOrDidMethodKeySignature from '../signature';
import { DidMethodKeySignatureValue } from './did-method-key-signature';

export class DidMethodKeyPublicKey extends withQualifier(TypedEnum, true) {
  static Type = 'didMethodKey';

  /**
   * Creates a new `DidMethodKey` from the supplied keypair.
   *
   * @param {DockKeypair} keypair
   * @returns {DidMethodKey}
   */
  static fromKeypair(keypair) {
    return this.from(keypair.publicKey().value);
  }

  static fromQualifiedString(str) {
    return super.fromQualifiedString(str.startsWith('did:key') ? str : `did:key:${str}`);
  }

  signWith(keyPair, bytes) {
    if (!this.eq(this.constructor.fromKeypair(keyPair))) {
      throw new Error('Expected keypair that has the same key as in `this`');
    }

    // eslint-disable-next-line no-use-before-define
    return new DidMethodKeySignature(
      // eslint-disable-next-line no-use-before-define
      new DidMethodKeySignatureValueObject(this, keyPair.sign(bytes)),
    );
  }
}

export class DidMethodKeySignatureValueObject extends TypedStruct {
  static Classes = {
    didMethodKey: DidMethodKeyPublicKey,
    sig: DidMethodKeySignatureValue,
  };
}

export class DidMethodKeySignature extends DidOrDidMethodKeySignature {
  static Type = 'didMethodKeySignature';

  static Class = DidMethodKeySignatureValueObject;
}

export class DidMethodKeyPublicKeyEd25519 extends DidMethodKeyPublicKey {
  static Class = class extends withQualifier(withBase58btc(PublicKeyEd25519Value)) {
    static Prefix = DidMethodKeyBytePrefixEd25519;

    static Qualifier = `did:key:${Ed25519PublicKeyPrefix}`;

    static fromUnqualifiedString(str) {
      return this.fromBase58btc(`${Ed25519PublicKeyPrefix}${str}`);
    }

    toEncodedString() {
      return this.toBase58btc();
    }

    toQualifiedEncodedString() {
      return `did:key:${this.toEncodedString()}`;
    }
  };

  static Type = PublicKeyEd25519Value.Type;
}
export class DidMethodKeyPublicKeySecp256k1 extends DidMethodKeyPublicKey {
  static Class = class extends withQualifier(withBase58btc(PublicKeySecp256k1Value)) {
    static Prefix = DidMethodKeyBytePrefixSecp256k1;

    static Qualifier = `did:key:${Secp256k1PublicKeyPrefix}`;

    static fromUnqualifiedString(str) {
      return this.fromBase58btc(`${Secp256k1PublicKeyPrefix}${str}`);
    }

    toEncodedString() {
      return this.toBase58btc();
    }

    toQualifiedEncodedString() {
      return `did:key:${this.toEncodedString()}`;
    }
  };

  static Type = PublicKeySecp256k1Value.Type;
}

DidMethodKeyPublicKey.bindVariants(
  DidMethodKeyPublicKeyEd25519,
  DidMethodKeyPublicKeySecp256k1,
);
