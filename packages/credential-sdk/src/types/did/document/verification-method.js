import {
  withFrom,
  TypedStruct,
  withBase58,
  TypedBytes,
  option,
  TypedString,
  withProp,
  TypedNumber,
  Any,
} from "../../generic";
import {
  BBDT16PublicKey,
  BBDT16PublicKeyValue,
  BBSPlusPublicKey,
  BBSPlusPublicKeyValue,
  BBSPublicKey,
  BBSPublicKeyValue,
  CheqdOffchainSignatureParamsRef,
  DockOffchainSignatureParamsRef,
  PSPublicKey,
  PSPublicKeyValue,
} from "../../offchain-signatures";
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519,
} from "../../public-keys";
import {
  EcdsaSecp256k1VerKeyName,
  Ed255192020VerKeyName,
  Ed25519VerKeyName,
  Sr25519VerKeyName,
  Bls12381BBSDockVerKeyName,
  Bls12381BBS23DockVerKeyName,
  Bls12381PSDockVerKeyName,
  Bls12381BBDT16DockVerKeyName,
} from "../../../vc/crypto";
import {
  Ed25519Verification2018Method,
  Ed25519Verification2020Method,
  VerificationMethodType,
} from "./verification-method-type";
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
  VerificationMethodRef,
} from "./verification-method-ref";
import {
  CheqdMainnetDid,
  CheqdTestnetDid,
  NamespaceDid,
} from "../onchain/typed-did";
import {
  fmtIter,
  valueBytes,
  filterObj,
  ensureEqualToOrPrototypeOf,
} from "../../../utils";
import { CurveType } from "../../offchain-signatures/curve-type";

export class PublicKeyBase58 extends withBase58(TypedBytes) {}

export class PublicKeyMetadata extends TypedStruct {
  static Classes = {
    paramsRef: option(Any),
    curveType: CurveType,
    participantId: option(TypedNumber),
  };
}

export class DockPublicKeyMetadata extends withProp(
  PublicKeyMetadata,
  "paramsRef",
  DockOffchainSignatureParamsRef
) {}

export class CheqdPublicKeyMetadata extends withProp(
  PublicKeyMetadata,
  "paramsRef",
  CheqdOffchainSignatureParamsRef
) {}

// eslint-disable-next-line no-use-before-define
export class VerificationMethod extends withFrom(TypedStruct, (value, from) =>
  value instanceof CheqdVerificationMethod
    ? value.toVerificationMethod()
    : from(value)
) {
  static Classes = {
    id: VerificationMethodRef,
    type: VerificationMethodType,
    controller: NamespaceDid,
    publicKeyBase58: option(PublicKeyBase58),
    publicKeyBase64: option(TypedBytes),
    publicKeyJwk: option(TypedString),
    publicKeyHex: option(TypedBytes),
    metadata: option(PublicKeyMetadata),
  };

  isOffchain() {
    return !(
      this.type instanceof Ed25519Verification2018Method ||
      this.type instanceof Ed25519Verification2020Method
    );
  }

  publicKey() {
    const bytes = (
      this.publicKeyBase58 ||
      this.publicKeyBase64 ||
      this.publicKeyJwk ||
      this.publicKeyHex
    )?.bytes;

    if (bytes == null) {
      throw new Error(
        `Expected either of ${fmtIter([
          "publicKeyBase58",
          "publicKeyBase64",
          "publicKeyJwk",
          "publicKeyHex",
        ])} to be specified`
      );
    }
    const metadataArgs = this.metadata && [
      this.metadata.paramsRef,
      this.metadata.curveType,
      this.metadata.participantId,
    ];

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
        return new BBSPlusPublicKey(
          new BBSPlusPublicKeyValue(bytes, ...metadataArgs)
        );
      case Bls12381BBS23DockVerKeyName:
        return new BBSPublicKey(new BBSPublicKeyValue(bytes, ...metadataArgs));
      case Bls12381PSDockVerKeyName:
        return new PSPublicKey(new PSPublicKeyValue(bytes, ...metadataArgs));
      case Bls12381BBDT16DockVerKeyName:
        return new BBDT16PublicKey(
          new BBDT16PublicKeyValue(bytes, ...metadataArgs)
        );
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
      void 0,
      void 0,
      void 0,
      didKey.publicKey
    );
  }

  // eslint-disable-next-line no-use-before-define
  toCheqd(Class = CheqdVerificationMethod) {
    // eslint-disable-next-line no-use-before-define
    return new (ensureEqualToOrPrototypeOf(CheqdVerificationMethod, Class))(
      this.id,
      this.controller,
      this.type,
      valueBytes(this.publicKey())
    );
  }

  toJSON() {
    return filterObj(super.toJSON(), (_, value) => value != null);
  }
}

export class CheqdVerificationMethod extends withFrom(
  TypedStruct,
  function fromFn(value, from) {
    return value instanceof VerificationMethod
      ? from(value.toCheqd(this))
      : from(value);
  }
) {
  static Classes = {
    id: CheqdVerificationMethodRef,
    controller: NamespaceDid,
    verificationMethodType: VerificationMethodType,
    verificationMaterial: PublicKeyBase58,
    metadata: option(PublicKeyMetadata),
  };

  isOffchain() {
    return !(
      this.verificationMethodType instanceof Ed25519Verification2018Method ||
      this.verificationMethodType instanceof Ed25519Verification2020Method
    );
  }

  toVerificationMethod() {
    return new VerificationMethod(
      this.id,
      this.verificationMethodType,
      this.controller,
      this.verificationMaterial
    );
  }
}

export class CheqdTestnetVerificationMethod extends withProp(
  withProp(CheqdVerificationMethod, "id", CheqdTestnetVerificationMethodRef),
  "controller",
  CheqdTestnetDid
) {}

export class CheqdMainnetVerificationMethod extends withProp(
  withProp(CheqdVerificationMethod, "id", CheqdMainnetVerificationMethodRef),
  "controller",
  CheqdMainnetDid
) {}
