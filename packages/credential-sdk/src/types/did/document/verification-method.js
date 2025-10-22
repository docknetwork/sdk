import {
  withFrom,
  TypedStruct,
  withBase58,
  TypedBytes,
  option,
  TypedString,
  withProp,
  TypedNumber,
  withBase58btc,
  withMultibase,
  withProps,
} from '../../generic';
import {
  BBDT16PublicKey,
  BBSPlusPublicKey,
  BBSPublicKey,
  CheqdOffchainSignatureParamsRef,
  DockOffchainSignatureParamsRef,
  PSPublicKey,
  CurveType,
  CurveTypeBls12381,
  CheqdTestnetOffchainSignatureParamsRef,
  CheqdMainnetOffchainSignatureParamsRef,
  DockOrCheqdOffchainSignatureParamsRef,
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
  JsonWebKey2020Method,
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
  fmtIterable,
  valueBytes,
  filterObj,
  ensureEqualToOrPrototypeOf,
  maybeToCheqdPayloadOrJSON,
  encodeAsBase58,
  u8aToString,
  normalizeToU8a,
} from '../../../utils';
import { isMultibaseBytes } from '../../../utils/encoding/multibase';

export class PublicKeyBase58 extends withBase58(TypedBytes) {}

export class PublicKeyBase64 extends withBase58btc(TypedBytes) {}

export class PublicKeyMultibase extends withMultibase(TypedBytes) {}

export class PublicKeyBase58OrMultibase extends PublicKeyBase58 {
  toString() {
    return this.bytes.length === 32 ? super.toString() : `z${super.toString()}`;
  }

  toCheqdPayload() {
    return this.toString();
  }

  static from(val) {
    if (typeof val === 'string' && val.substr(0, 1) === 'z') {
      return PublicKeyBase58OrMultibase.fromBase58(val.substr(1));
    } else if (typeof val === 'string') {
      return PublicKeyBase58OrMultibase.fromBase58(val);
    }

    return new PublicKeyBase58OrMultibase(val);
  }
}

export class TypedJsonWebKey extends withFrom(
  TypedStruct,
  (value, fromFn) => fromFn(value),
) {
  static Classes = {
    crv: option(TypedString),
    kty: option(TypedString),
    x: option(TypedString),
  };

  // TODO: implement to support cheqd DID controlling with JsonWebKey
  get bytes() {
    return [0, 0, 0, 0];
  }
}

export class PublicKeyMetadata extends withFrom(TypedStruct, (value, from) => {
  const self = from(value);

  if (self?.paramsRef == null && self?.participantId == null) {
    return null;
  } else {
    return self;
  }
}) {
  static Classes = {
    paramsRef: option(DockOrCheqdOffchainSignatureParamsRef),
    curveType: CurveType,
    participantId: option(TypedNumber),
  };

  constructor(paramsRef, curveType = new CurveTypeBls12381(), ...args) {
    super(paramsRef, curveType, ...args);
  }

  toArgs() {
    const { paramsRef, curveType, participantId } = this;

    return [paramsRef, curveType, participantId];
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

export class CheqdTestnetPublicKeyMetadata extends withProp(
  PublicKeyMetadata,
  'paramsRef',
  CheqdTestnetOffchainSignatureParamsRef,
) {}

export class CheqdMainnetPublicKeyMetadata extends withProp(
  PublicKeyMetadata,
  'paramsRef',
  CheqdMainnetOffchainSignatureParamsRef,
) {}

export class VerificationMethod extends withFrom(
  TypedStruct,
  function from(value, fromFn) {
    return fromFn(
      // eslint-disable-next-line no-use-before-define
      value instanceof CheqdVerificationMethod
        ? value.toVerificationMethod(this)
        : value,
    );
  },
) {
  static Classes = {
    id: VerificationMethodRef,
    type: VerificationMethodType,
    controller: NamespaceDid,
    publicKeyBase58: option(PublicKeyBase58),
    publicKeyBase64: option(PublicKeyBase64),
    publicKeyMultibase: option(PublicKeyMultibase),
    publicKeyJwk: option(TypedJsonWebKey),
    publicKeyHex: option(TypedBytes),
    metadata: option(PublicKeyMetadata),
  };

  isOffchain() {
    return !(
      this.type instanceof Ed25519Verification2018Method
      || this.type instanceof Ed25519Verification2020Method
      || this.type instanceof JsonWebKey2020Method
    );
  }

  publicKeyBytes(fullRepresentation = false) {
    const bytes = (
      this.publicKeyMultibase
      || this.publicKeyBase58
      || this.publicKeyBase64
      || this.publicKeyJwk
      || this.publicKeyHex
    )?.bytes;

    if (bytes == null) {
      throw new Error(
        `Expected either of ${fmtIterable([
          'publicKeyMultibase',
          'publicKeyBase58',
          'publicKeyBase64',
          'publicKeyJwk',
          'publicKeyHex',
        ])} to be specified`,
      );
    }

    if (this.publicKeyMultibase) {
      return (fullRepresentation || bytes.length === 32) ? bytes : bytes.slice(bytes.length - 32);
    }

    return bytes;
  }

  publicKeyClass() {
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
    const PublicKey = this.publicKeyClass();
    const bytes = this.publicKeyBytes();
    const metaArgs = this.metadata?.toArgs() || [];

    return new PublicKey(new PublicKey.Class(bytes, ...metaArgs));
  }

  static fromDidKey(keyRef, didKey) {
    const ref = VerificationMethodRef.from(keyRef);

    const isJsonWebKey = true;
    const pkBytes = valueBytes(didKey.publicKey);
    const isMultibaseKey = !isJsonWebKey && isMultibaseBytes(pkBytes);

    return new this(
      ref,
      didKey.publicKey.constructor.VerKeyType,
      ref[0],
      (!isMultibaseKey && !isJsonWebKey) ? pkBytes : void 0,
      void 0,
      isMultibaseKey ? pkBytes : void 0,
      isJsonWebKey ? this.verificationMaterial : void 0,
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
      normalizeToU8a(this.publicKeyBytes(true)),
      this.metadata,
    );
  }

  toJSON() {
    return filterObj(super.toJSON(), (_, value) => value != null);
  }

  toCheqdPayload() {
    return filterObj(
      this.apply(maybeToCheqdPayloadOrJSON),
      (_, value) => value != null,
    );
  }
}

export class CheqdVerificationMethod extends withFrom(
  TypedStruct,
  function from(value, fromFn) {
    return fromFn(
      value instanceof VerificationMethod ? value.toCheqd(this) : value,
    );
  },
) {
  static Classes = {
    id: CheqdVerificationMethodRef,
    controller: NamespaceDid,
    verificationMethodType: VerificationMethodType,
    verificationMaterial: PublicKeyBase58OrMultibase,
    metadata: option(PublicKeyMetadata),
  };

  isOffchain() {
    return !(
      this.verificationMethodType instanceof Ed25519Verification2018Method
      || this.verificationMethodType instanceof Ed25519Verification2020Method
    );
  }

  toVerificationMethod(VerMethod = VerificationMethod) {
    // Convert the Cheqd-specific ID to a generic VerificationMethodRef
    const isJsonWebKey = true;
    const genericId = VerificationMethodRef.from(this.id.toJSON());
    const isMultibaseKey = !isJsonWebKey && isMultibaseBytes(this.verificationMaterial);
    return new (ensureEqualToOrPrototypeOf(VerificationMethod, VerMethod))(
      genericId,
      this.verificationMethodType,
      this.controller,
      (!isMultibaseKey && !isJsonWebKey) ? this.verificationMaterial : void 0,
      void 0,
      isMultibaseKey ? this.verificationMaterial : void 0,
      isJsonWebKey ? this.verificationMaterial : void 0,
      void 0,
      this.metadata,
    );
  }

  toJSON() {
    return filterObj(super.toJSON(), (_, value) => value != null);
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  toCheqdPayload() {
    return filterObj(
      this.apply(maybeToCheqdPayloadOrJSON),
      (_, value) => value != null,
    );
  }
}

export class CheqdVerificationMethodAssertion extends withProp(
  VerificationMethod,
  'metadata',
  option(CheqdPublicKeyMetadata),
) {
  toCheqdPayload() {
    return JSON.stringify(JSON.stringify(super.toCheqdPayload()));
  }

  static from(obj) {
    return typeof obj === 'string'
      ? super.fromJSON(JSON.parse(JSON.parse(obj)))
      : super.from(obj);
  }
}

export class CheqdTestnetVerificationMethod extends withProps(
  CheqdVerificationMethod,
  {
    id: CheqdTestnetVerificationMethodRef,
    controller: CheqdTestnetDid,
    metadata: option(CheqdTestnetPublicKeyMetadata),
  },
) {}

export class CheqdMainnetVerificationMethod extends withProps(
  CheqdVerificationMethod,
  {
    id: CheqdMainnetVerificationMethodRef,
    controller: CheqdMainnetDid,
    metadata: option(CheqdMainnetPublicKeyMetadata),
  },
) {}

export class CheqdMainnetVerificationMethodAssertion extends withProps(
  CheqdVerificationMethodAssertion,
  {
    id: CheqdMainnetVerificationMethodRef,
    controller: CheqdMainnetDid,
    metadata: option(CheqdMainnetPublicKeyMetadata),
  },
) {}

export class CheqdTestnetVerificationMethodAssertion extends withProps(
  CheqdVerificationMethodAssertion,
  {
    id: CheqdTestnetVerificationMethodRef,
    controller: CheqdTestnetDid,
    metadata: option(CheqdTestnetPublicKeyMetadata),
  },
) {}

export class CheqdVerificationMethodAssertionLegacy extends withFrom(
  CheqdVerificationMethod,
  (value, from) => {
    const self = from(value);
    const verMethod = self.toVerificationMethod();

    if (verMethod.isOffchain()) {
      let json;
      try {
        json = JSON.parse(u8aToString(verMethod.publicKeyBytes()));
      } catch {
        return self;
      }

      const pk = verMethod.publicKeyClass().from(json);
      self.verificationMaterial = valueBytes(pk.bytes);
      self.metadata = pk.value;
    }

    return self;
  },
) {
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

    return JSON.stringify(JSON.stringify(payload));
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  static from(obj) {
    return typeof obj === 'string'
      ? super.fromJSON(JSON.parse(JSON.parse(obj)))
      : super.from(obj);
  }
}

export class CheqdMainnetVerificationMethodAssertionLegacy extends withProps(
  CheqdVerificationMethodAssertionLegacy,
  {
    id: CheqdMainnetVerificationMethodRef,
    controller: CheqdMainnetDid,
    metadata: option(CheqdMainnetPublicKeyMetadata),
  },
) {}

export class CheqdTestnetVerificationMethodAssertionLegacy extends withProps(
  CheqdVerificationMethodAssertionLegacy,
  {
    id: CheqdTestnetVerificationMethodRef,
    controller: CheqdTestnetDid,
    metadata: option(CheqdTestnetPublicKeyMetadata),
  },
) {}
