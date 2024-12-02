import {
  withFrom, TypedStruct, withBase58, TypedBytes, option, TypedString,
} from '../../generic';
import {
  BBDT16PublicKey,
  BBDT16PublicKeyValue,
  BBSPlusPublicKey,
  BBSPlusPublicKeyValue,
  BBSPublicKey,
  BBSPublicKeyValue,
  PSPublicKey,
  PSPublicKeyValue,
} from '../../offchain-signatures';
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519,
} from '../../public-keys';
import {
  EcdsaSecp256k1VerKeyName,
  Ed255192020VerKeyName,
  Ed25519VerKeyName,
  Sr25519VerKeyName,
  Bls12381BBSDockVerKeyName,
  Bls12381BBS23DockVerKeyName,
  Bls12381PSDockVerKeyName,
  Bls12381BBDT16DockVerKeyName,
} from '../../../vc/crypto';
import { Ed25519Verification2018Method, Ed25519Verification2020Method, VerificationMethodType } from './verification-method-type';
import VerificationMethodRef from './verification-method-ref';
import { NamespaceDid } from '../onchain/typed-did';
import {
  fmtIter, valueBytes,
} from '../../../utils';
import { DidKeyValue } from '../onchain/did-key';

export class PublicKeyBase58 extends withBase58(TypedBytes) {}

// eslint-disable-next-line no-use-before-define
export class VerificationMethod extends withFrom(TypedStruct, (value, from) => (value instanceof CheqdVerificationMethod
  ? value.toVerificationMethod()
  : from(value))) {
  static Classes = {
    id: VerificationMethodRef,
    type: VerificationMethodType,
    controller: NamespaceDid,
    publicKeyBase58: option(PublicKeyBase58),
    publicKeyBase64: option(TypedBytes),
    publicKeyJwk: option(TypedString),
    publicKeyHex: option(TypedBytes),
  };

  isOffchain() {
    return !(
      this.type instanceof Ed25519Verification2018Method
      || this.type instanceof Ed25519Verification2020Method
    );
  }

  publicKey() {
    const bytes = (
      this.publicKeyBase58
      || this.publicKeyBase64
      || this.publicKeyJwk
      || this.publicKeyHex
    )?.bytes;

    if (bytes == null) {
      throw new Error(
        `Expected either of ${fmtIter([
          'publicKeyBase58',
          'publicKeyBase64',
          'publicKeyJwk',
          'publicKeyHex',
        ])} to be specified`,
      );
    }

    switch (this.type.type) {
      case Ed25519VerKeyName:
        return new PublicKeyEd25519(bytes);
      case Sr25519VerKeyName:
        return new PublicKeySr25519(bytes);
      case Ed255192020VerKeyName:
        return new PublicKeyEd25519(bytes);
      case EcdsaSecp256k1VerKeyName:
        return new PublicKeySecp256k1(bytes);
      case Bls12381BBSDockVerKeyName:
        return new BBSPlusPublicKey(new BBSPlusPublicKeyValue(bytes));
      case Bls12381BBS23DockVerKeyName:
        return new BBSPublicKey(new BBSPublicKeyValue(bytes));
      case Bls12381PSDockVerKeyName:
        return new PSPublicKey(new PSPublicKeyValue(bytes));
      case Bls12381BBDT16DockVerKeyName:
        return new BBDT16PublicKey(new BBDT16PublicKeyValue(bytes));
      default:
        throw new Error(`Unknown key type ${this.type.type}`);
    }
  }

  static fromDidKey(keyRef, didKey) {
    const ref = VerificationMethodRef.from(keyRef);

    return new this(
      ref,
      didKey.publicKey.constructor.VerKeyType,
      ref[0],
      valueBytes(didKey.publicKey),
    );
  }

  toCheqdVerificationMethod() {
    // eslint-disable-next-line no-use-before-define
    return new CheqdVerificationMethod(
      this.id,
      this.controller,
      this.type,
      valueBytes(this.publicKey()),
    );
  }

  toVerificationMethodRefWithDidKey() {
    // eslint-disable-next-line no-use-before-define
    return new VerificationMethodRefWithDidKey(this.id, this.publicKey());
  }
}

export class CheqdVerificationMethod extends withFrom(
  TypedStruct,
  (value, from) => (value instanceof VerificationMethod
    ? value.toCheqdVerificationMethod()
    : from(value)),
) {
  static Classes = {
    id: VerificationMethodRef,
    controller: NamespaceDid,
    verificationMethodType: VerificationMethodType,
    verificationMaterial: PublicKeyBase58,
  };

  isOffchain() {
    return !(
      this.verificationMethodType instanceof Ed25519Verification2018Method
      || this.verificationMethodType instanceof Ed25519Verification2020Method
    );
  }

  toVerificationMethod() {
    return new VerificationMethod(
      this.id,
      this.verificationMethodType,
      this.controller,
      this.verificationMaterial,
    );
  }
}

export class VerificationMethodRefWithDidKey extends withFrom(
  TypedStruct,
  function from(value, fromFn) {
    if (typeof value === 'string') {
      return new this(...value.split('='));
    } else {
      return fromFn(value);
    }
  },
) {
  static Classes = {
    ref: VerificationMethodRef,
    key: withBase58(DidKeyValue),
  };

  toVerificationMethod() {
    // eslint-disable-next-line no-use-before-define
    return new VerificationMethod(
      this.ref,
      this.key.constructor.VerKeyType,
      this.ref.did,
      this.key.value.bytes,
    );
  }

  toJSON() {
    const { ref, key } = this;

    return `${ref}=${key}`;
  }
}
