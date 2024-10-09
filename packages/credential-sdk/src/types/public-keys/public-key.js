import { TypedEnum } from '../generic';
import PublicKeyX25519Value from './public-key-x25519-value';
import PublicKeyEd25519Value from './public-key-ed25519-value';
import PublicKeySecp256k1Value from './public-key-secp256k1-value';
import PublicKeySr25519Value from './public-key-sr25519-value';

/**
 * Class representing either Ed25519 or Secp256k1 or Sr25519 or X25519 PublicKey
 * @class
 * @extends {TypedEnum}
 */
export class PublicKey extends TypedEnum {
  static get VerKeyType() {
    return this.Class.VerKeyType;
  }
}
/**
 * Class representing Ed25519 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class PublicKeyEd25519 extends PublicKey {
  static Class = PublicKeyEd25519Value;
}
/**
 * Class representing Secp256k1 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class PublicKeySecp256k1 extends PublicKey {
  static Class = PublicKeySecp256k1Value;
}
/**
 * Class representing Sr25519 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class PublicKeySr25519 extends PublicKey {
  static Class = PublicKeySr25519Value;
}
/**
 * Class representing X25519 PublicKey
 * @class
 * @extends {PublicKey}
 */
export class PublicKeyX25519 extends PublicKey {
  static Class = PublicKeyX25519Value;
}

PublicKey.bindVariants(
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519,
  PublicKeyX25519,
);
