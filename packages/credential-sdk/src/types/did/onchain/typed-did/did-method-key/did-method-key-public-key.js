import bs58 from "bs58";
import { base58btc } from "multiformats/bases/base58";
import varint from "varint";
import { TypedEnum, TypedStruct, withQualifier } from "../../../../generic";
import {
  PublicKeyEd25519Value,
  PublicKeySecp256k1Value,
} from "../../../../public-keys";
import {
  DidMethodKeyBytePrefixEd25519,
  DidMethodKeyBytePrefixSecp256k1,
  DidMethodKeyQualifier,
  Ed25519PublicKeyPrefix,
  Secp256k1PublicKeyPrefix,
} from "../../constants";
import DidOrDidMethodKeySignature from "../signature";
import { DidMethodKeySignatureValue } from "./did-method-key-signature";

export class DidMethodKeyPublicKey extends withQualifier(TypedEnum) {
  static Qualifier = DidMethodKeyQualifier;

  static Type = "didMethodKey";

  /**
   * Instantiates `DidMethodKey` from a fully qualified did string.
   * @param {string} did - fully qualified `did:key:*` string
   * @returns {DidMethodKey}
   */
  static fromUnqualifiedString(id) {
    const multicodecPubKey = base58btc.decode(id);
    varint.decode(multicodecPubKey); // NOTE: called to get byte length below
    const bytes = multicodecPubKey.slice(varint.decode.bytes);

    let PublicKey;
    if (id.startsWith(Secp256k1PublicKeyPrefix)) {
      // eslint-disable-next-line no-use-before-define
      PublicKey = DidMethodKeyPublicKeySecp256k1;
    } else if (id.startsWith(Ed25519PublicKeyPrefix)) {
      // eslint-disable-next-line no-use-before-define
      PublicKey = DidMethodKeyPublicKeyEd25519;
    } else {
      throw new Error(`Unsupported \`did:key:*\`: \`${id}\``);
    }

    return new PublicKey(bytes);
  }

  /**
   * Returns unqualified public key encoded in `BS58`.
   */
  toEncodedString() {
    const prefix = this.constructor.Prefix;
    const publicKeyBytes = this.value.bytes;

    // Concatenate the prefix and the public key bytes
    const didKeyBytes = new Uint8Array(prefix.length + publicKeyBytes.length);
    didKeyBytes.set(prefix);
    didKeyBytes.set(publicKeyBytes, prefix.length);

    // Encode the concatenated bytes to Base58 with z prefix
    return `z${bs58.encode(didKeyBytes)}`;
  }

  /**
   * Creates a new `DidMethodKey` from the supplied keypair.
   *
   * @param {DockKeypair} keypair
   * @returns {DidMethodKey}
   */
  static fromKeypair(keypair) {
    return this.from(keypair.publicKey().value);
  }

  signWith(keyPair, bytes) {
    if (!this.eq(this.constructor.fromKeypair(keyPair))) {
      throw new Error("Expected keypair that has the same key as in `this`");
    }

    // eslint-disable-next-line no-use-before-define
    return new DidMethodKeySignature(
      // eslint-disable-next-line no-use-before-define
      new DidMethodKeySignatureValueObject(this, keyPair.sign(bytes))
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
  static Type = "didMethodKeySignature";

  static Class = DidMethodKeySignatureValueObject;
}

export class DidMethodKeyPublicKeyEd25519 extends DidMethodKeyPublicKey {
  static Class = PublicKeyEd25519Value;

  static Type = PublicKeyEd25519Value.Type;

  static Prefix = DidMethodKeyBytePrefixEd25519;
}
export class DidMethodKeyPublicKeySecp256k1 extends DidMethodKeyPublicKey {
  static Class = PublicKeySecp256k1Value;

  static Type = PublicKeySecp256k1Value.Type;

  static Prefix = DidMethodKeyBytePrefixSecp256k1;
}

DidMethodKeyPublicKey.bindVariants(
  DidMethodKeyPublicKeyEd25519,
  DidMethodKeyPublicKeySecp256k1
);
