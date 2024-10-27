import { base58btc } from 'multiformats/bases/base58';
import varint from 'varint';
import bs58 from 'bs58';
import {
  Null,
  TypedArray,
  TypedBytes,
  TypedEnum,
  TypedNumber,
  TypedSet,
  TypedString,
  TypedStruct,
  TypedTuple,
  TypedUUID,
  option,
  withFrom,
  withQualifier,
} from '../generic';
import { LinkedDomains } from './offchain';
import { NamespaceDid } from './onchain/typed-did';
import { DidKey, DidKeyValue, DidKeys } from './onchain/did-key';
import { VerificationRelationship } from './onchain/verification-relationship';
import {
  EcdsaSecp256k1VerKeyName,
  Ed255192020VerKeyName,
  Ed25519VerKeyName,
  Sr25519VerKeyName,
} from '../../vc/custom_crypto';
import {
  PublicKeyEd25519,
  PublicKeySecp256k1,
  PublicKeySr25519,
} from '../public-keys';
import {
  fmtIter,
  isBytes,
  stringToU8a,
  u8aToString,
  valueBytes,
  withExtendedStaticProperties,
} from '../../utils';
import {
  BBDT16PublicKey,
  BBDT16PublicKeyValue,
  BBSPlusPublicKey,
  BBSPlusPublicKeyValue,
  BBSPublicKey,
  BBSPublicKeyValue,
  PSPublicKey,
  PSPublicKeyValue,
} from '../offchain-signatures';

export const ATTESTS_IRI = 'https://rdf.dock.io/alpha/2021#attestsDocumentContents';

export const CONTEXT_URI = 'https://www.w3.org/ns/did/v1';

class Context extends TypedArray {
  static Class = TypedString;
}

class ID extends NamespaceDid {}

class AlsoKnownAs extends TypedArray {
  static Class = NamespaceDid;
}

class Controllers extends TypedArray {
  static Class = NamespaceDid;
}

class VerificationMethodType extends TypedEnum {}
class Ed25519Verification2018Method extends VerificationMethodType {
  static Class = Null;

  static Type = 'Ed25519VerificationKey2018';
}
class Ed25519Verification2020Method extends VerificationMethodType {
  static Class = Null;

  static Type = 'Ed25519VerificationKey2020';
}
class Sr25519Verification2020Method extends VerificationMethodType {
  static Class = Null;

  static Type = 'Sr25519VerificationKey2020';
}
class EcdsaSecp256k1VerificationKey2019 extends VerificationMethodType {
  static Class = Null;

  static Type = 'EcdsaSecp256k1VerificationKey2019';
}
class X25519KeyAgreementKey2019 extends VerificationMethodType {
  static Class = Null;

  static Type = 'X25519KeyAgreementKey2019';
}
class Bls12381G2VerificationKeyDock2022 extends VerificationMethodType {
  static Class = Null;

  static Type = 'Bls12381G2VerificationKeyDock2022';
}
class Bls12381BBSVerificationKeyDock2023 extends VerificationMethodType {
  static Class = Null;

  static Type = 'Bls12381BBSVerificationKeyDock2023';
}
class Bls12381BBDT16VerificationKeyDock2024 extends VerificationMethodType {
  static Class = Null;

  static Type = 'Bls12381BBDT16VerificationKeyDock2024';
}
class Bls12381PSVerificationKeyDock2023 extends VerificationMethodType {
  static Class = Null;

  static Type = 'Bls12381PSVerificationKeyDock2023';
}
VerificationMethodType.bindVariants(
  Ed25519Verification2018Method,
  Ed25519Verification2020Method,
  Sr25519Verification2020Method,
  EcdsaSecp256k1VerificationKey2019,
  X25519KeyAgreementKey2019,
  Bls12381G2VerificationKeyDock2022,
  Bls12381BBSVerificationKeyDock2023,
  Bls12381BBDT16VerificationKeyDock2024,
  Bls12381PSVerificationKeyDock2023,
);

export class TypedNumberOrTypedString extends withFrom(
  TypedNumber,
  (value, from) => (!Number.isNaN(Number(value)) || value instanceof TypedNumber
    ? from(value)
    : TypedString.from(value)),
) {}

export class VerificationMethodRef extends withQualifier(TypedTuple) {
  static Qualifier = '';

  static Classes = [NamespaceDid, TypedNumber];

  get did() {
    return this[0];
  }

  get index() {
    return this[1];
  }

  static fromUnqualifiedString(str) {
    const regex = new RegExp(`^${this.Qualifier}([^#]+)#keys-(\\d+)$`);
    const match = str.match(regex);

    if (!match) {
      throw new Error(`Invalid format for VerificationMethodRef: \`${str}\``);
    }

    const [, did, index] = match;
    return new this(did, parseInt(index, 10));
  }

  toEncodedString() {
    const { did, index } = this;

    return `${did}#keys-${index}`;
  }

  toJSON() {
    return this.toEncodedString();
  }
}

export class IdentRef extends withQualifier(TypedTuple) {
  static Qualifier = '';

  static Ident = TypedString;

  static get Classes() {
    return [NamespaceDid, this.Ident];
  }

  static random(did) {
    return new this(did, this.Ident.random());
  }

  get did() {
    return this[0];
  }

  get value() {
    return this[1];
  }

  static fromUnqualifiedString(str) {
    const regex = new RegExp(`^${this.Qualifier}([^#]+)#(.+)$`);
    const match = str.match(regex);

    if (!match) {
      throw new Error(`Invalid format for IdentRef: \`${str}\``);
    }

    const [, did, value] = match;
    return new this(did, value);
  }

  toEncodedString() {
    const { did, value } = this;

    return `${did}#${value}`;
  }

  toJSON() {
    return this.toString();
  }
}

export class VerificationMethodRefOrIdentRef extends withFrom(
  VerificationMethodRef,
  (value, from) => {
    try {
      return from(value);
    } catch {
      return IdentRef.from(value);
    }
  },
) {}

export class DidKeyValueWithRef extends withFrom(
  TypedStruct,
  function (value, from) {
    if (typeof value === 'string') {
      const [ref, key] = value.split('=');
      // eslint-disable-next-line no-use-before-define
      const parsed = JSON.parse(u8aToString(new PublicKeyBase58(key).bytes));

      return new this(ref, parsed);
    } else {
      return from(value);
    }
  },
) {
  static Classes = {
    ref: VerificationMethodRef,
    key: DidKeyValue,
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

    return `${ref.toString()}=${
      // eslint-disable-next-line no-use-before-define
      new PublicKeyBase58(stringToU8a(JSON.stringify(key.toJSON()))).value
    }`;
  }
}

export class VerificationMethodRefOrKey extends withFrom(
  VerificationMethodRef,
  (value, from) => {
    try {
      return DidKeyValueWithRef.from(value);
    } catch (err) {
      return from(value);
    }
  },
) {}

export class PublicKeyBase58 extends TypedString {
  constructor(value) {
    if (typeof value === 'string') {
      // Decoding base58 if the input is a string
      super(bs58.decode(value));
    } else {
      // Handle case where value is already in byte format
      super(value);
    }
  }

  get value() {
    const { bytes } = this;
    // Encode bytes back to base58
    return bs58.encode(bytes);
  }
}

export class PublicKeyMultibase extends withExtendedStaticProperties(
  ['Prefix'],
  TypedString,
) {
  // Define the static prefix as a class variable
  static Prefix;

  constructor(value) {
    if (typeof value === 'string') {
      if (value.startsWith('z')) {
        // Decode base58btc multibase string
        const decoded = base58btc.decode(value);
        varint.decode(decoded); // Decode to get byte length
        const bytes = decoded.slice(varint.decode.bytes);

        super(bytes);
      } else {
        throw new Error(`Invalid multibase string format: ${value}`);
      }
    } else {
      // If it's already bytes
      super(value);
    }
  }

  get value() {
    const {
      bytes,
      constructor: { Prefix },
    } = this;

    // Use the static prefix (MULTICODEC_ED25519_HEADER)
    const multibase = new Uint8Array(Prefix.length + bytes.length);

    // Add multibase prefix and concatenate with bytes
    multibase.set(Prefix);
    multibase.set(bytes, Prefix.length);

    // Return the encoded base58btc multibase string
    return base58btc.encode(multibase);
  }
}

export class CheqdEd25519Key extends PublicKeyMultibase {
  static Prefix = new Uint8Array([0xed, 0x01]);
}

export class PublicKeyBase64 extends TypedString {
  constructor(value) {
    if (typeof value === 'string') {
      super(atob(value));
    } else {
      super(value);
    }
  }

  get value() {
    return btoa(this.bytes);
  }
}

// eslint-disable-next-line no-use-before-define
export class VerificationMethod extends withFrom(TypedStruct, (value, from) => (value instanceof CheqdVerificationMethod
  ? value.toVerificationMethod()
  : from(value))) {
  static Classes = {
    id: VerificationMethodRef,
    type: VerificationMethodType,
    controller: NamespaceDid,
    publicKeyBase58: option(PublicKeyBase58),
    publicKeyBase64: option(PublicKeyBase64),
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
      case Bls12381G2VerificationKeyDock2022.Type:
        return new BBSPlusPublicKey(new BBSPlusPublicKeyValue(bytes));
      case Bls12381BBSVerificationKeyDock2023.Type:
        return new BBSPublicKey(new BBSPublicKeyValue(bytes));
      case Bls12381PSVerificationKeyDock2023.Type:
        return new PSPublicKey(new PSPublicKeyValue(bytes));
      case Bls12381BBDT16VerificationKeyDock2024.Type:
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

  toDidKeyValueWithRef() {
    return new DidKeyValueWithRef(this.id, this.publicKey());
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

class VerificationMethods extends TypedArray {
  static Class = VerificationMethod;
}

export class ServiceEndpointId extends IdentRef {}

export class SuffixServiceEndpointId extends withFrom(
  TypedString,
  (value, from) => from(isBytes(value) ? value : ServiceEndpointId.from(value)[1]),
) {}

export class Service extends TypedStruct {
  static Classes = {
    id: ServiceEndpointId,
    type: LinkedDomains,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpoint extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.type, serviceEndpoint.origins);
  }

  toCheqdService() {
    // eslint-disable-next-line no-use-before-define
    return new CheqdService(this.id, this.type, this.serviceEndpoint);
  }
}

export class CheqdService extends withFrom(TypedStruct, (value, from) => (value instanceof Service ? value.toCheqdService() : from(value))) {
  static Classes = {
    id: ServiceEndpointId,
    serviceType: LinkedDomains,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpoint extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.type, serviceEndpoint.origins);
  }
}

export class Services extends TypedArray {
  static Class = Service;
}

export class VerificationMethodReferences extends TypedArray {
  static Class = VerificationMethodRef;
}

export class VersionId extends TypedUUID {}

class AssertionMethod extends TypedArray {
  static Class = VerificationMethodRefOrKey;
}

export class DIDDocument extends TypedStruct {
  static Classes = {
    '@context': Context,
    id: ID,
    alsoKnownAs: option(AlsoKnownAs),
    controller: Controllers,
    verificationMethod: VerificationMethods,
    service: option(Services),
    authentication: option(VerificationMethodReferences),
    assertionMethod: option(VerificationMethodReferences),
    keyAgreement: option(VerificationMethodReferences),
    capabilityInvocation: option(VerificationMethodReferences),
    capabilityDelegation: option(VerificationMethodReferences),
    [ATTESTS_IRI]: option(TypedString),
  };

  static create(
    did,
    keys = [],
    controllers = [],
    serviceEndpoints = {},
    {
      context = [CONTEXT_URI],
      alsoKnownAs = [],
      capabilityDelegation = [],
      [ATTESTS_IRI]: attests = null,
    } = {},
  ) {
    const doc = new this(
      context,
      did,
      alsoKnownAs,
      controllers,
      [],
      [],
      [],
      [],
      [],
      [],
      capabilityDelegation,
      attests,
    );

    let idx = 0;
    for (const key of keys) {
      const didKey = DidKey.from(key);
      doc.addKey([did, ++idx], didKey);
    }
    for (const [id, serviceEndpoint] of Object.entries(serviceEndpoints)) {
      doc.addServiceEndpoint([did, id], serviceEndpoint);
    }

    return doc;
  }

  addKey(keyRef, didKey) {
    const ref = VerificationMethodRef.from(keyRef);
    const key = DidKey.from(didKey);

    if (this.verificationMethod.find((existing) => existing.eq(ref))) {
      throw new Error(`Verification method \`${ref}\` already exists`);
    }

    if (key.verRels.isAuthentication()) {
      this.authentication ||= [];
      this.authentication.push(ref);
    }
    if (key.verRels.isAssertion()) {
      this.assertionMethod ||= [];
      this.assertionMethod.push(ref);
    }
    if (key.verRels.isKeyAgreement()) {
      this.keyAgreement ||= [];
      this.keyAgreement.push(ref);
    }
    if (key.verRels.isCapabilityInvocation()) {
      this.capabilityInvocation ||= [];
      this.capabilityInvocation.push(ref);
    }

    this.verificationMethod.push(VerificationMethod.fromDidKey(ref, key));

    return this;
  }

  addController(controller) {
    if (this.controller.some((ctrl) => ctrl.eq(controller))) {
      throw new Error(`Controller \`${controller}\` already exists`);
    }
    this.controller.push(controller);

    return this;
  }

  removeController(controller) {
    const idx = this.controller.findIndex((ctrl) => ctrl.eq(controller));
    // eslint-disable-next-line
    if (~idx) {
      throw new Error(`Controller \`${controller}\` doesn't exists`);
    }
    this.controller.splice(idx, 1);

    return this;
  }

  addServiceEndpoint(id, serviceEndpoint) {
    if (this.service.some((service) => service.id.eq(id))) {
      throw new Error(`Service endpoint with id \`${id}\` already exists`);
    }
    this.service.push(Service.fromServiceEndpoint(id, serviceEndpoint));

    return this;
  }

  removeServiceEndpoint(id) {
    this.service = this.service.filter((service) => !service.id.eq(id));

    return this;
  }

  removeKey(keyRef) {
    const ref = VerificationMethodRef.from(keyRef);
    const keyIndex = this.verificationMethod.findIndex((method) => method.id.eq(ref));

    // eslint-disable-next-line no-bitwise
    if (~keyIndex) {
      this.verificationMethod.splice(keyIndex, 1);
    } else {
      throw new Error(`Verification method with id \`${ref}\` doesn't exist`);
    }

    const isNotRef = (value) => !(value.ref ?? value).eq(ref);

    this.assertionMethod = this.assertionMethod?.filter(isNotRef);
    this.authentication = this.authentication?.filter(isNotRef);
    this.keyAgreement = this.keyAgreement?.filter(isNotRef);
    this.capabilityInvocation = this.capabilityInvocation?.filter(isNotRef);
    this.capabilityDelegation = this.capabilityDelegation?.filter(isNotRef);

    return this;
  }

  nextKeyIndex() {
    return (
      [...this.verificationMethod].reduce(
        (max, { id: { index } }) => Math.max(max, index ?? 0),
        0,
      ) + 1
    );
  }

  get attests() {
    return this[ATTESTS_IRI];
  }

  get publicKey() {
    return this.verificationMethod;
  }

  set attests(iri) {
    this[ATTESTS_IRI] = iri;
  }

  setAttests(iri) {
    this.attests = iri;

    return this;
  }

  didKeys() {
    const {
      verificationMethod,
      authentication,
      assertionMethod,
      keyAgreement,
      capabilityInvocation,
    } = this;

    class VerificationMethodRefOrKeySet extends TypedSet {
      static Class = VerificationMethodRefOrKey;
    }

    const auth = new VerificationMethodRefOrKeySet(authentication);
    const assertion = new VerificationMethodRefOrKeySet(assertionMethod);
    const keyAgr = new VerificationMethodRefOrKeySet(keyAgreement);
    const capInv = new VerificationMethodRefOrKeySet(capabilityInvocation);

    const keys = [...verificationMethod]
      .map((method) => {
        const verRels = new VerificationRelationship();
        if (auth.has(method.id)) {
          verRels.setAuthentication();
        }
        if (assertion.has(method.id)) {
          verRels.setAssertion();
        }
        if (keyAgr.has(method.id)) {
          verRels.setKeyAgreement();
        }
        if (capInv.has(method.id)) {
          verRels.setCapabilityInvocation();
        }

        return [method.id, new DidKey(method.publicKey(), verRels)];
      })
      .filter(Boolean);

    return new DidKeys(keys);
  }

  toCheqd(versionId = TypedUUID.random()) {
    const {
      '@context': context,
      id,
      alsoKnownAs,
      controller,
      verificationMethod,
      authentication,
      assertionMethod,
      capabilityInvocation,
      capabilityDelegation,
      keyAgreement,
      service,
    } = this;

    // eslint-disable-next-line no-use-before-define
    return new CheqdDIDDocument(
      context,
      id,
      alsoKnownAs,
      controller,
      verificationMethod,
      service,
      authentication,
      assertionMethod,
      keyAgreement,
      capabilityInvocation,
      capabilityDelegation,
      versionId,
    );
  }
}

export class CheqdDIDDocument extends TypedStruct {
  static Classes = {
    context: Context,
    id: ID,
    alsoKnownAs: AlsoKnownAs,
    controller: Controllers,
    verificationMethod: class CheqdVerificationMethods extends TypedArray {
      static Class = CheqdVerificationMethod;
    },
    service: class CheqdServices extends TypedArray {
      static Class = CheqdService;
    },
    authentication: VerificationMethodReferences,
    assertionMethod: AssertionMethod,
    keyAgreement: VerificationMethodReferences,
    capabilityInvocation: VerificationMethodReferences,
    capabilityDelegation: VerificationMethodReferences,
    versionId: option(VersionId),
  };

  constructor(...args) {
    super(...args);

    const offchainVerMethod = [
      ...this.verificationMethod.filter((verMethod) => verMethod.isOffchain()),
    ].map((verMethod) => verMethod.toVerificationMethod());
    this.verificationMethod = this.verificationMethod.filter(
      (verMethod) => !verMethod.isOffchain(),
    );

    this.assertionMethod = [
      ...this.assertionMethod,
      ...[...offchainVerMethod].map((verMethod) => verMethod.toDidKeyValueWithRef()),
    ];
  }

  toDIDDocument() {
    const {
      context,
      id,
      alsoKnownAs,
      controller,
      verificationMethod,
      authentication,
      assertionMethod,
      capabilityInvocation,
      capabilityDelegation,
      keyAgreement,
      service,
    } = this;

    const offchainVerMethod = [
      ...assertionMethod.filter(
        (keyRefOrKey) => keyRefOrKey instanceof DidKeyValueWithRef,
      ),
    ].map((verMethod) => verMethod.toVerificationMethod());
    const assertionMethodWithoutOffchainKeys = assertionMethod.filter(
      (keyRefOrKey) => !(keyRefOrKey instanceof DidKeyValueWithRef),
    );

    return new DIDDocument(
      context,
      id,
      alsoKnownAs,
      controller,
      [...verificationMethod, ...offchainVerMethod],
      service,
      authentication,
      assertionMethodWithoutOffchainKeys,
      keyAgreement,
      capabilityInvocation,
      capabilityDelegation,
      null,
    );
  }
}
