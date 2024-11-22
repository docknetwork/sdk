import {
  TypedArray,
  TypedSet,
  TypedString,
  TypedStruct,
  TypedUUID,
  option,
} from '../../generic';
import { NamespaceDid } from '../onchain/typed-did';
import { DidKey, DidKeys } from '../onchain/did-key';
import { VerificationRelationship } from '../onchain/verification-relationship';
import { Service, CheqdService } from './service';
import { VerificationMethod, CheqdVerificationMethod, VerificationMethodRefWithDidKey } from './verification-method';
import VerificationMethodRefOrDidKey from './verification-method-ref-or-did-key';
import VerificationMethodRef from './verification-method-ref';
import { ATTESTS_IRI, CONTEXT_URI } from './const';

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

class VerificationMethods extends TypedArray {
  static Class = VerificationMethod;
}

export class Services extends TypedArray {
  static Class = Service;
}

export class VerificationMethodReferences extends TypedArray {
  static Class = VerificationMethodRef;
}

export class VersionId extends TypedUUID {}

class AssertionMethod extends TypedArray {
  static Class = VerificationMethodRefOrDidKey;
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

    class VerificationMethodRefOrDidKeySet extends TypedSet {
      static Class = VerificationMethodRefOrDidKey;
    }

    const auth = new VerificationMethodRefOrDidKeySet(authentication);
    const assertion = new VerificationMethodRefOrDidKeySet(assertionMethod);
    const keyAgr = new VerificationMethodRefOrDidKeySet(keyAgreement);
    const capInv = new VerificationMethodRefOrDidKeySet(capabilityInvocation);

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
      });

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
      ...[...offchainVerMethod].map((verMethod) => verMethod.toVerificationMethodRefWithDidKey()),
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
        (keyRefOrKey) => keyRefOrKey instanceof VerificationMethodRefWithDidKey,
      ),
    ].map((verMethod) => verMethod.toVerificationMethod());
    const assertionMethodWithoutOffchainKeys = assertionMethod.filter(
      (keyRefOrKey) => !(keyRefOrKey instanceof VerificationMethodRefWithDidKey),
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

export * from './const';
export * from './service';
export * from './verification-method';
export * from './verification-method-type';
export { default as IdentRef } from './ident-ref';
export { VerificationMethodRef };
