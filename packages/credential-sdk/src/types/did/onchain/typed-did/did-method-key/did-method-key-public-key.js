import { base58btc } from 'multiformats/bases/base58';
import varint from 'varint';
import {
  TypedBytes,
  TypedEnum,
  TypedStruct,
  sized,
  withQualifier,
} from '../../../../generic';
import {
  PublicKeyEd25519Value,
  PublicKeySecp256k1Value,
} from '../../../../public-keys';
import {
  DidMethodKeyBBS23ByteSize,
  DidMethodKeyBBSPlusByteSize,
  DidMethodKeyBytePrefixBBS23,
  DidMethodKeyBytePrefixBBSPlus,
  DidMethodKeyBytePrefixEd25519,
  DidMethodKeyBytePrefixSecp256k1,
  DidMethodKeyQualifier,
} from '../../constants';
import DidOrDidMethodKeySignature from '../signature';
import { DidMethodKeySignatureValue } from './did-method-key-signature';
import {
  encodeAsBase58btc,
  normalizeToU8a,
} from '../../../../../utils';

const Bls12381BBS23DockVerKeyName = 'Bls12381BBSVerificationKeyDock2023';
const Bls12381BBSDockVerKeyName = 'Bls12381G2VerificationKeyDock2022';

export class DidMethodKeyPublicKey extends withQualifier(TypedEnum) {
  static Qualifier = DidMethodKeyQualifier;

  static Type = 'didMethodKey';

  /**
   * Instantiates `DidMethodKey` from a fully qualified did string.
   * @param {string} did - fully qualified `did:key:*` string
   * @returns {DidMethodKey}
   */
  static fromUnqualifiedString(id) {
    const decoded = base58btc.decode(id);
    varint.decode(decoded);
    const prefix = decoded.slice(0, varint.decode.bytes);
    const bytes = decoded.slice(varint.decode.bytes);
    const hasPrefix = (candidate) => (
      prefix.length === candidate.length
      && prefix.every((byte, idx) => byte === candidate[idx])
    );

    let PublicKey;
    if (hasPrefix(DidMethodKeyBytePrefixSecp256k1)) {
      // eslint-disable-next-line no-use-before-define
      PublicKey = DidMethodKeyPublicKeySecp256k1;
    } else if (hasPrefix(DidMethodKeyBytePrefixEd25519)) {
      // eslint-disable-next-line no-use-before-define
      PublicKey = DidMethodKeyPublicKeyEd25519;
    } else if (hasPrefix(DidMethodKeyBytePrefixBBS23)) {
      // eslint-disable-next-line no-use-before-define
      PublicKey = DidMethodKeyPublicKeyBBS;
    } else if (hasPrefix(DidMethodKeyBytePrefixBBSPlus)) {
      // eslint-disable-next-line no-use-before-define
      PublicKey = DidMethodKeyPublicKeyBBSPlus;
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
    const publicKey = this.value.bytes;

    return encodeAsBase58btc(prefix, publicKey);
  }

  /**
   * Creates a new `DidMethodKey` from the supplied keypair.
   *
   * @param {DockKeypair} keypair
   * @returns {DidMethodKey}
   */
  static fromKeypair(keypair) {
    if (keypair?.type === Bls12381BBS23DockVerKeyName) {
      // eslint-disable-next-line no-use-before-define
      return new DidMethodKeyPublicKeyBBS(normalizeToU8a(keypair.publicKeyBuffer));
    } else if (keypair?.type === Bls12381BBSDockVerKeyName) {
      // eslint-disable-next-line no-use-before-define
      return new DidMethodKeyPublicKeyBBSPlus(
        normalizeToU8a(keypair.publicKeyBuffer),
      );
    }

    return this.from(keypair.publicKey().value);
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
  static Class = PublicKeyEd25519Value;

  static Type = PublicKeyEd25519Value.Type;

  static Prefix = DidMethodKeyBytePrefixEd25519;
}

export class DidMethodKeyPublicKeySecp256k1 extends DidMethodKeyPublicKey {
  static Class = PublicKeySecp256k1Value;

  static Type = PublicKeySecp256k1Value.Type;

  static Prefix = DidMethodKeyBytePrefixSecp256k1;
}

class PublicKeyBBSValue extends sized(TypedBytes) {
  static Type = 'bbs';

  static Size = DidMethodKeyBBS23ByteSize;

  static VerKeyType = Bls12381BBS23DockVerKeyName;
}

class PublicKeyBBSPlusValue extends sized(TypedBytes) {
  static Type = 'bbsPlus';

  static Size = DidMethodKeyBBSPlusByteSize;

  static VerKeyType = Bls12381BBSDockVerKeyName;
}

export class DidMethodKeyPublicKeyBBS extends DidMethodKeyPublicKey {
  static Class = PublicKeyBBSValue;

  static Type = PublicKeyBBSValue.Type;

  static Prefix = DidMethodKeyBytePrefixBBS23;
}

export class DidMethodKeyPublicKeyBBSPlus extends DidMethodKeyPublicKey {
  static Class = PublicKeyBBSPlusValue;

  static Type = PublicKeyBBSPlusValue.Type;

  static Prefix = DidMethodKeyBytePrefixBBSPlus;
}

DidMethodKeyPublicKey.bindVariants(
  DidMethodKeyPublicKeyEd25519,
  DidMethodKeyPublicKeySecp256k1,
  DidMethodKeyPublicKeyBBS,
  DidMethodKeyPublicKeyBBSPlus,
);
