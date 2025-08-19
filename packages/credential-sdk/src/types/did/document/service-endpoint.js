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
import { isBytes } from '../../../utils/types/bytes';
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

const DIDCommMessagingPlaceholder = createPlaceholder((value) => {
  if (
    +maybeToNumber(value) === 0b0010
    || String(value) === 'DIDCommMessaging'
    || value == null
  ) {
    return 0b0010;
  } else {
    throw new Error(`Unknown value \`${maybeToJSONString(value)}\``);
  }
});

export class ServiceEndpointType extends TypedEnum {
  static fromApi(value) {
    return this.from(value);
  }

  static fromJSON(value) {
    return this.from(value);
  }

  static from(value) {
    // Convert string values to the appropriate variant
    if (typeof value === 'string') {
      switch (value) {
        case 'LinkedDomains':
          // eslint-disable-next-line no-use-before-define
          return new LinkedDomains();
        case 'DIDCommMessaging':
          // eslint-disable-next-line no-use-before-define
          return new DIDCommMessaging();
        default:
          throw new Error(`Unknown service type: ${value}`);
      }
    }

    // If it's already an instance of a variant, return it
    // eslint-disable-next-line no-use-before-define
    if (value instanceof LinkedDomains || value instanceof DIDCommMessaging) {
      return value;
    }

    // Otherwise, try to create a LinkedDomains as default
    // eslint-disable-next-line no-use-before-define
    return new LinkedDomains();
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

export class DIDCommMessaging extends ServiceEndpointType {
  static Type = 'DIDCommMessaging';

  static Class = DIDCommMessagingPlaceholder;

  toJSON() {
    return this.constructor.Type;
  }

  apply(fn) {
    return fn(this.constructor.Type);
  }
}

// Bind all variants at once to avoid conflicts
ServiceEndpointType.bindVariants(LinkedDomains, DIDCommMessaging);

export class ServiceEndpointOrigin extends TypedString {}

export class ServiceEndpointOrigins extends TypedArray {
  static Class = ServiceEndpointOrigin;
}

export class ServiceEndpoint extends TypedStruct {
  static Classes = {
    types: ServiceEndpointType,
    origins: ServiceEndpointOrigins,
  };

  constructor(type, origins) {
    // Handle string types by converting them to the appropriate service type
    let serviceType;
    if (typeof type === 'string') {
      switch (type) {
        case 'LinkedDomains':
          serviceType = new LinkedDomains();
          break;
        case 'DIDCommMessaging':
          serviceType = new DIDCommMessaging();
          break;
        default:
          throw new Error(`Unknown service type: ${type}`);
      }
    } else if (type instanceof LinkedDomains || type instanceof DIDCommMessaging) {
      serviceType = type;
    } else {
      throw new Error(`Invalid service type: ${type}`);
    }

    super(serviceType, origins);
  }
}

export class Service extends TypedStruct {
  static Classes = {
    id: ServiceEndpointId,
    type: ServiceEndpointType,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpointString extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.types, serviceEndpoint.origins);
  }

  toJSON() {
    return {
      id: this.id.toJSON(),
      type: this.type.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };
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
    serviceType: ServiceEndpointType,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpointString extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.type, serviceEndpoint.origins);
  }

  toJSON() {
    return {
      id: this.id.toJSON(),
      type: this.serviceType.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };
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
