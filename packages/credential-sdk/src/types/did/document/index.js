import {
  TypedArray,
  TypedMap,
  TypedSet,
  TypedString,
  TypedStruct,
  TypedUUID,
  option,
  withFrom,
} from "../../generic";
import {
  NamespaceDid,
  CheqdNamespaceDid,
  CheqdTestnetDid,
  CheqdMainnetDid,
} from "../onchain/typed-did";
import { DidKey, DidKeys } from "../onchain/did-key";
import { VerificationRelationship } from "../onchain/verification-relationship";
import { Service, CheqdService } from "./service";
import {
  VerificationMethod,
  CheqdVerificationMethod,
  CheqdTestnetVerificationMethod,
  CheqdMainnetVerificationMethod,
} from "./verification-method";
import VerificationMethodRefOrCheqdVerificationMethod, {
  VerificationMethodRefOrCheqdMainnetVerificationMethod,
  VerificationMethodRefOrCheqdTestnetVerificationMethod,
} from "./verification-method-ref-or-cheqd-verification-method";
import { Ed25519Verification2018Method } from "./verification-method-type";
import {
  VerificationMethodRef,
  CheqdVerificationMethodRef,
  CheqdTestnetVerificationMethodRef,
  CheqdMainnetVerificationMethodRef,
} from "./verification-method-ref";
import { ATTESTS_IRI, CONTEXT_URI } from "./const";
import { ensureEqualToOrPrototypeOf } from "../../../utils";

class Context extends TypedArray {
  static Class = TypedString;
}

class ID extends NamespaceDid {}

class CheqdID extends CheqdNamespaceDid {}

class CheqdTestnetID extends CheqdTestnetDid {}

class CheqdMainnetID extends CheqdMainnetDid {}

class AlsoKnownAs extends TypedArray {
  static Class = NamespaceDid;
}

class Controllers extends TypedArray {
  static Class = NamespaceDid;
}

class CheqdControllers extends TypedArray {
  static Class = CheqdNamespaceDid;
}

class CheqdTestnetControllers extends TypedArray {
  static Class = CheqdTestnetDid;
}

class CheqdMainnetControllers extends TypedArray {
  static Class = CheqdMainnetDid;
}

class VerificationMethods extends TypedArray {
  static Class = VerificationMethod;
}

class CheqdVerificationMethods extends TypedArray {
  static Class = CheqdVerificationMethod;
}

class CheqdTestnetVerificationMethods extends TypedArray {
  static Class = CheqdTestnetVerificationMethod;
}

class CheqdMainnetVerificationMethods extends TypedArray {
  static Class = CheqdMainnetVerificationMethod;
}

export class Services extends TypedArray {
  static Class = Service;
}

class CheqdServices extends TypedArray {
  static Class = CheqdService;
}

export class VerificationMethodReferences extends TypedArray {
  static Class = VerificationMethodRef;
}

export class CheqdVerificationMethodReferences extends TypedArray {
  static Class = CheqdVerificationMethodRef;
}

export class CheqdTestnetVerificationMethodReferences extends TypedArray {
  static Class = CheqdTestnetVerificationMethodRef;
}

export class CheqdMainnetVerificationMethodReferences extends TypedArray {
  static Class = CheqdMainnetVerificationMethodRef;
}

export class VersionId extends TypedUUID {}

class CheqdAssertionMethod extends TypedArray {
  static Class = VerificationMethodRefOrCheqdVerificationMethod;
}

class CheqdTestnetAssertionMethod extends TypedArray {
  static Class = VerificationMethodRefOrCheqdTestnetVerificationMethod;
}

class CheqdMainnetAssertionMethod extends TypedArray {
  static Class = VerificationMethodRefOrCheqdMainnetVerificationMethod;
}

export class DIDDocument extends withFrom(TypedStruct, (value, from) =>
  from(value instanceof CheqdDIDDocument ? value.toDIDDocument() : value)
) {
  static Classes = {
    "@context": Context,
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
    } = {}
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
      attests
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

    if (this.verificationMethod.find((existing) => existing.id.eq(ref))) {
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

  addServiceEndpoint(id, serviceEndpoint) {
    if (this.service.some((service) => service.id.eq(id))) {
      throw new Error(`Service endpoint with id \`${id}\` already exists`);
    }
    this.service.push(Service.fromServiceEndpoint(id, serviceEndpoint));

    return this;
  }

  removeKey(keyRef) {
    const ref = VerificationMethodRef.from(keyRef);
    const keyIndex = this.verificationMethod.findIndex((method) =>
      method.id.eq(ref)
    );

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

  removeController(controller) {
    const idx = this.controller.findIndex((ctrl) => ctrl.eq(controller));
    // eslint-disable-next-line
    if (~idx) {
      throw new Error(`Controller \`${controller}\` doesn't exists`);
    }
    this.controller.splice(idx, 1);

    return this;
  }

  removeServiceEndpoint(id) {
    this.service = this.service.filter((service) => !service.id.eq(id));

    return this;
  }

  nextKeyIndex() {
    return (
      [...this.verificationMethod].reduce(
        (max, { id: { index } }) => Math.max(max, index ?? 0),
        0
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

    class VerificationMethodRefOrCheqdVerificationMethodSet extends TypedSet {
      static Class = VerificationMethodRefOrCheqdVerificationMethod;
    }

    const auth = new VerificationMethodRefOrCheqdVerificationMethodSet(
      authentication
    );
    const assertion = new VerificationMethodRefOrCheqdVerificationMethodSet(
      assertionMethod
    );
    const keyAgr = new VerificationMethodRefOrCheqdVerificationMethodSet(
      keyAgreement
    );
    const capInv = new VerificationMethodRefOrCheqdVerificationMethodSet(
      capabilityInvocation
    );

    const keys = [...verificationMethod].map((method) => {
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
    });

    return new DidKeys(keys);
  }

  // eslint-disable-next-line no-use-before-define
  toCheqd(versionId = TypedUUID.random(), Class = CheqdDIDDocument) {
    const {
      "@context": context,
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
    return new (ensureEqualToOrPrototypeOf(CheqdDIDDocument, Class))(
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
      versionId
    );
  }
}

export class CheqdDIDDocument extends TypedStruct {
  static Classes = {
    context: Context,
    id: CheqdID,
    alsoKnownAs: AlsoKnownAs,
    controller: CheqdControllers,
    verificationMethod: CheqdVerificationMethods,
    service: CheqdServices,
    authentication: CheqdVerificationMethodReferences,
    assertionMethod: CheqdAssertionMethod,
    keyAgreement: CheqdVerificationMethodReferences,
    capabilityInvocation: CheqdVerificationMethodReferences,
    capabilityDelegation: CheqdVerificationMethodReferences,
    versionId: option(VersionId),
  };

  constructor(...args) {
    super(...args);

    const { verificationMethod } = this;

    this.verificationMethod = [...verificationMethod].map((verMethod) => {
      if (verMethod.isOffchain()) {
        return new verMethod.constructor(
          verMethod.id,
          verMethod.controller,
          new Ed25519Verification2018Method(),
          Array(32).fill(0)
        );
      }

      return verMethod;
    });
    const offchainVerMethod = verificationMethod.filter((verMethod) =>
      verMethod.isOffchain()
    );

    this.assertionMethod = [
      ...this.assertionMethod.filter(
        (ref) => !offchainVerMethod.some((verMethod) => verMethod.id.eq(ref))
      ),
      ...offchainVerMethod,
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

    const assertionMethodOffchainKeys = new (class extends TypedMap {
      static KeyClass = VerificationMethodRef;

      static ValueClass = CheqdVerificationMethod;
    })(
      [...assertionMethod]
        .map((keyRefOrKey) =>
          keyRefOrKey instanceof CheqdVerificationMethod
            ? [keyRefOrKey.id, keyRefOrKey]
            : null
        )
        .filter(Boolean)
    );
    const verificationMethodWithOffchainKeys = [
      ...VerificationMethods.from(verificationMethod),
    ].map((verMethod) => {
      const offchain = assertionMethodOffchainKeys.get(verMethod.id);

      if (offchain != null) {
        return new VerificationMethod(
          verMethod.id,
          offchain.verificationMethodType,
          verMethod.controller,
          offchain.verificationMaterial
        );
      }

      return verMethod;
    });
    const assertionMethodOnlyRefs = [...assertionMethod]
      .map((keyRefOrKey) =>
        keyRefOrKey instanceof CheqdVerificationMethod
          ? keyRefOrKey.id
          : keyRefOrKey
      )
      .filter(Boolean);

    return new DIDDocument(
      context,
      id,
      alsoKnownAs,
      controller,
      verificationMethodWithOffchainKeys,
      service,
      authentication,
      assertionMethodOnlyRefs,
      keyAgreement,
      capabilityInvocation,
      capabilityDelegation,
      null
    );
  }
}

export class CheqdTestnetDIDDocument extends CheqdDIDDocument {
  static Classes = {
    context: Context,
    id: CheqdTestnetID,
    alsoKnownAs: AlsoKnownAs,
    controller: CheqdTestnetControllers,
    verificationMethod: CheqdTestnetVerificationMethods,
    service: CheqdServices,
    authentication: CheqdTestnetVerificationMethodReferences,
    assertionMethod: CheqdTestnetAssertionMethod,
    keyAgreement: CheqdTestnetVerificationMethodReferences,
    capabilityInvocation: CheqdTestnetVerificationMethodReferences,
    capabilityDelegation: CheqdTestnetVerificationMethodReferences,
    versionId: option(VersionId),
  };
}

export class CheqdMainnetDIDDocument extends CheqdDIDDocument {
  static Classes = {
    context: Context,
    id: CheqdMainnetID,
    alsoKnownAs: AlsoKnownAs,
    controller: CheqdMainnetControllers,
    verificationMethod: CheqdMainnetVerificationMethods,
    service: CheqdServices,
    authentication: CheqdMainnetVerificationMethodReferences,
    assertionMethod: CheqdMainnetAssertionMethod,
    keyAgreement: CheqdMainnetVerificationMethodReferences,
    capabilityInvocation: CheqdMainnetVerificationMethodReferences,
    capabilityDelegation: CheqdMainnetVerificationMethodReferences,
    versionId: option(VersionId),
  };
}

export * from "./const";
export * from "./service";
export * from "./verification-method";
export * from "./verification-method-type";
export { default as IdentRef } from "./ident-ref";
export { VerificationMethodRef };
