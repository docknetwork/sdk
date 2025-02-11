import {
  ensureEqualToOrPrototypeOf,
  maybeToJSONString,
  maybeToNumber,
} from '../../../utils';
import {
  TypedStruct,
  TypedString,
  TypedArray,
  TypedEnum,
  createPlaceholder,
  TypedMap,
  withFrom,
  withProp,
} from '../../generic';
import IdentRef from './ident-ref';
import { isBytes } from '../../../utils/type-helpers';
import { CheqdDid, CheqdMainnetDid, CheqdTestnetDid } from '../onchain';

export class ServiceEndpointId extends IdentRef {}

export class CheqdServiceEndpointId extends IdentRef {
  static Did = CheqdDid;
}

export class CheqdTestnetServiceEndpointId extends ServiceEndpointId {
  static Did = CheqdTestnetDid;
}

export class CheqdMainnetServiceEndpointId extends ServiceEndpointId {
  static Did = CheqdMainnetDid;
}

export class SuffixServiceEndpointId extends withFrom(
  TypedString,
  (value, from) => from(isBytes(value) ? value : ServiceEndpointId.from(value)[1]),
) {}

const LinkedDomainsPlaceholder = createPlaceholder((value) => {
  if (
    +maybeToNumber(value) === 0b0001
    || String(value) === 'LinkedDomains'
    || value == null
  ) {
    return 0b0001;
  } else {
    throw new Error(`Unknown value \`${maybeToJSONString(value)}\``);
  }
});

export class ServiceEndpointType extends TypedEnum {
  static fromApi(value) {
    return new this(value);
  }

  static fromJSON(value) {
    return new this(value);
  }

  static from(value) {
    return new this(value);
  }
}
export class LinkedDomains extends ServiceEndpointType {
  static Type = 'LinkedDomains';

  static Class = LinkedDomainsPlaceholder;

  toJSON() {
    return this.constructor.Type;
  }

  apply(fn) {
    return fn(this.constructor.Type);
  }
}

ServiceEndpointType.bindVariants(LinkedDomains);

export class ServiceEndpointOrigin extends TypedString {}

export class ServiceEndpointOrigins extends TypedArray {
  static Class = ServiceEndpointOrigin;
}

export class ServiceEndpoint extends TypedStruct {
  static Classes = {
    types: LinkedDomains,
    origins: ServiceEndpointOrigins,
  };
}

export class Service extends TypedStruct {
  static Classes = {
    id: ServiceEndpointId,
    type: LinkedDomains,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpointString extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.type, serviceEndpoint.origins);
  }

  // eslint-disable-next-line no-use-before-define
  toCheqd(Class = CheqdService) {
    // eslint-disable-next-line no-use-before-define
    return new (ensureEqualToOrPrototypeOf(CheqdService, Class))(
      this.id,
      this.type,
      this.serviceEndpoint,
    );
  }
}

export class CheqdService extends withFrom(
  TypedStruct,
  function from(value, fromFn) {
    return fromFn(value instanceof Service ? value.toCheqd(this) : value);
  },
) {
  static Classes = {
    id: CheqdServiceEndpointId,
    serviceType: LinkedDomains,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpointString extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.type, serviceEndpoint.origins);
  }
}

export class CheqdTestnetService extends withProp(
  CheqdService,
  'id',
  CheqdTestnetServiceEndpointId,
) {}
export class CheqdMainnetService extends withProp(
  CheqdService,
  'id',
  CheqdMainnetServiceEndpointId,
) {}

export class ServiceEndpoints extends TypedMap {
  static KeyClass = ServiceEndpointId;

  static ValueClass = ServiceEndpoint;
}
