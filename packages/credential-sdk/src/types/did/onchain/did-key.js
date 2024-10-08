import {
  Any,
  TypedArray,
  TypedEnum,
  TypedMap,
  TypedStruct,
} from '../../generic';
import {
  PublicKeyEd25519Value,
  PublicKeySecp256k1Value,
  PublicKeySr25519Value,
  PublicKeyX25519Value,
} from '../../public-keys';
import {
  BBSPublicKeyValue,
  BBSPlusPublicKeyValue,
  PSPublicKeyValue,
} from '../../offchain-signatures';
import { VerificationRelationship } from './verification-relationship';
import {
  Bls12381BBS23DockVerKeyName,
  Bls12381BBSDockVerKeyName,
  Bls12381PSDockVerKeyName,
} from '../../../vc/custom_crypto';

/**
 * Class representing either of possible DidKeys.
 * @class
 * @extends {TypedEnum}
 */
export class DidKeyValue extends TypedEnum {
  static get VerKeyType() {
    return this.Class.VerKeyType;
  }
}

/**
 * Class representing Ed25519 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class DidKeyEd25519PublicKey extends DidKeyValue {
  static Type = 'ed25519';

  static Class = PublicKeyEd25519Value;

  static VerificationMethod = true;
}
/**
 * Class representing Secp256k1 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class DidKeySecp256k1PublicKey extends DidKeyValue {
  static Type = 'secp256k1';

  static Class = PublicKeySecp256k1Value;

  static VerificationMethod = true;
}
/**
 * Class representing Sr25519 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class DidKeySr25519PublicKey extends DidKeyValue {
  static Type = 'sr25519';

  static Class = PublicKeySr25519Value;

  static VerificationMethod = true;
}
/**
 * Class representing X25519 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class DidKeyX25519PublicKey extends DidKeyValue {
  static Type = 'x25519';

  static Class = PublicKeyX25519Value;

  static VerificationMethod = true;
}
export class DidKeyBBSPublicKey extends DidKeyValue {
  static Class = BBSPublicKeyValue;

  static Type = 'bbs';

  static VerKeyType = Bls12381BBS23DockVerKeyName;

  static VerificationMethod = false;
}
export class DidKeyBBSPlusPublicKey extends DidKeyValue {
  static Class = BBSPlusPublicKeyValue;

  static Type = 'bbsPlus';

  static VerKeyType = Bls12381BBSDockVerKeyName;

  static VerificationMethod = false;
}
export class DidKeyPSPublicKey extends DidKeyValue {
  static Class = PSPublicKeyValue;

  static Type = 'ps';

  static VerKeyType = Bls12381PSDockVerKeyName;

  static VerificationMethod = false;
}

DidKeyValue.bindVariants(
  DidKeyEd25519PublicKey,
  DidKeySecp256k1PublicKey,
  DidKeySr25519PublicKey,
  DidKeyX25519PublicKey,
  DidKeyBBSPublicKey,
  DidKeyBBSPlusPublicKey,
  DidKeyPSPublicKey,
);

const Signing = [
  DidKeyEd25519PublicKey,
  DidKeySr25519PublicKey,
  DidKeySecp256k1PublicKey,
];

const Assertion = [
  DidKeyBBSPublicKey,
  DidKeyBBSPlusPublicKey,
  DidKeyPSPublicKey,
];

export class DidKey extends TypedStruct {
  static Classes = {
    publicKey: DidKeyValue,
    verRels: VerificationRelationship,
  };

  /**
   *
   * @param {DidKeyValue} pk
   * @param {VerificationRelationship} verRels
   */
  constructor(pk, verRels = new VerificationRelationship()) {
    const publicKey = DidKeyValue.from(pk);

    if (!+verRels) {
      if (
        Signing.some(
          (klass) => publicKey instanceof klass || publicKey instanceof klass.Class,
        )
      ) {
        verRels.setAllSigning();
      } else if (
        Assertion.some(
          (klass) => publicKey instanceof klass || publicKey instanceof klass.Class,
        )
      ) {
        verRels.setAssertion();
      } else {
        verRels.setKeyAgreement();
      }
    }

    super(publicKey, verRels);
  }

  static fromKeypair(keyPair, verRels) {
    return new this(keyPair.publicKey(), verRels);
  }
}

export class DidKeysList extends TypedArray {
  static Class = DidKey;
}

export class DidKeys extends TypedMap {
  static KeyClass = Any;

  static ValueClass = DidKey;
}
