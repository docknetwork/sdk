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
} from '../../generic';
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
  CurveType,
  CurveTypeBls12381,
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
import {
  Ed25519Verification2018Method,
  Ed25519Verification2020Method,
  VerificationMethodType,
} from './verification-method-type';
import {
  CheqdMainnetVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdVerificationMethodRef,
  VerificationMethodRef,
} from './verification-method-ref';
import {
  CheqdMainnetDid,
  CheqdTestnetDid,
  NamespaceDid,
} from '../onchain/typed-did';
import {
  fmtIter,
  valueBytes,
  filterObj,
  ensureEqualToOrPrototypeOf,
  maybeToCheqdPayloadOrJSON,
  u8aToString,
  encodeAsBase58,
} from '../../../utils';

export class PublicKeyBase58 extends withBase58(TypedBytes) {}

export class PublicKeyMetadata extends TypedStruct {
  static Classes = {
    paramsRef: option(Any),
    curveType: CurveType,
    participantId: option(TypedNumber),
  };

  constructor(paramsRef, curveType = new CurveTypeBls12381(), ...args) {
    super(paramsRef, curveType, ...args);
  }
}

export class DockPublicKeyMetadata extends withProp(
  PublicKeyMetadata,
  'paramsRef',
  DockOffchainSignatureParamsRef,
) {}

export class CheqdPublicKeyMetadata extends withProp(
  PublicKeyMetadata,
  'paramsRef',
  CheqdOffchainSignatureParamsRef,
) {}

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
    metadata: option(PublicKeyMetadata),
  };

  isOffchain() {
    return !(
      this.type instanceof Ed25519Verification2018Method
      || this.type instanceof Ed25519Verification2020Method
    );
  }

  get publicKeyBytes() {
    return (
      this.publicKeyBase58
      || this.publicKeyBase64
      || this.publicKeyJwk
      || this.publicKeyHex
    )?.bytes;
  }

  get publicKeyClass() {
    switch (this.type.type) {
      case Ed25519VerKeyName:
        return PublicKeyEd25519;
      case Sr25519VerKeyName:
        return PublicKeySr25519;
      case Ed255192020VerKeyName:
        return PublicKeyEd25519;
      case EcdsaSecp256k1VerKeyName:
        return PublicKeySecp256k1;
      case Bls12381BBSDockVerKeyName:
        return BBSPlusPublicKey;
      case Bls12381BBS23DockVerKeyName:
        return BBSPublicKey;
      case Bls12381PSDockVerKeyName:
        return PSPublicKey;
      case Bls12381BBDT16DockVerKeyName:
        return BBDT16PublicKey;
      default:
        throw new Error(`Unknown key type ${this.type.type}`);
    }
  }

  publicKey() {
    const bytes = this.publicKeyBytes;

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
    const metadataArgs = this.metadata
      ? [
        this.metadata.paramsRef,
        this.metadata.curveType,
        this.metadata.participantId,
      ]
      : [];

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
          new BBSPlusPublicKeyValue(bytes, ...metadataArgs),
        );
      case Bls12381BBS23DockVerKeyName:
        return new BBSPublicKey(new BBSPublicKeyValue(bytes, ...metadataArgs));
      case Bls12381PSDockVerKeyName:
        return new PSPublicKey(new PSPublicKeyValue(bytes, ...metadataArgs));
      case Bls12381BBDT16DockVerKeyName:
        return new BBDT16PublicKey(
          new BBDT16PublicKeyValue(bytes, ...metadataArgs),
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
      didKey.isOffchain() ? didKey.publicKey.value : null,
    );
  }

  // eslint-disable-next-line no-use-before-define
  toCheqd(Class = CheqdVerificationMethod) {
    // eslint-disable-next-line no-use-before-define
    return new (ensureEqualToOrPrototypeOf(CheqdVerificationMethod, Class))(
      this.id,
      this.controller,
      this.type,
      valueBytes(this.publicKey()),
      this.metadata,
    );
  }

  toJSON() {
    return filterObj(super.toJSON(), (_, value) => value != null);
  }
}

export class CheqdVerificationMethod extends withFrom(
  TypedStruct,
  function fromFn(value, from) {
    if (value instanceof VerificationMethod) {
      return from(value.toCheqd(this));
    } else {
      return from(value);
    }
  },
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
      void 0,
      void 0,
      void 0,
      this.metadata,
    );
  }

  toCheqdPayload() {
    const payload = filterObj(
      this.apply(maybeToCheqdPayloadOrJSON),
      (key, value) => key !== 'metadata' && value != null,
    );

    const verMethod = this.toVerificationMethod();

    if (verMethod.isOffchain()) {
      const pk = verMethod.publicKey();

      if (pk.value.paramsRef != null || pk.value.participantId != null) {
        payload.verificationMaterial = encodeAsBase58(pk.toJSONStringBytes());
      }
    }

    return payload;
  }
}

export class CheqdVerificationMethodAssertion extends withFrom(
  CheqdVerificationMethod,
  (value, from) => {
    const self = from(value);
    const verMethod = self.toVerificationMethod();

    if (verMethod.isOffchain()) {
      let json;
      try {
        json = JSON.parse(u8aToString(verMethod.publicKeyBytes));
      } catch {
        return self;
      }

      const pk = verMethod.publicKeyClass.from(json);
      self.verificationMaterial = valueBytes(pk.bytes);
      self.metadata = pk.value;
    }

    return self;
  },
) {
  toCheqdPayload() {
    return JSON.stringify(JSON.stringify(super.toCheqdPayload()));
  }

  toJSON() {
    return this.toCheqdPayload();
  }

  static from(obj) {
    return typeof obj === 'string'
      ? super.fromJSON(JSON.parse(JSON.parse(obj)))
      : super.from(obj);
  }
}

export class CheqdTestnetVerificationMethod extends withProp(
  withProp(CheqdVerificationMethod, 'id', CheqdTestnetVerificationMethodRef),
  'controller',
  CheqdTestnetDid,
) {}

export class CheqdMainnetVerificationMethod extends withProp(
  withProp(CheqdVerificationMethod, 'id', CheqdMainnetVerificationMethodRef),
  'controller',
  CheqdMainnetDid,
) {}

export class CheqdTestnetVerificationMethodAssertion extends withProp(
  withProp(
    CheqdVerificationMethodAssertion,
    'id',
    CheqdTestnetVerificationMethodRef,
  ),
  'controller',
  CheqdTestnetDid,
) {}

export class CheqdMainnetVerificationMethodAssertion extends withProp(
  withProp(
    CheqdVerificationMethodAssertion,
    'id',
    CheqdMainnetVerificationMethodRef,
  ),
  'controller',
  CheqdMainnetDid,
) {}
