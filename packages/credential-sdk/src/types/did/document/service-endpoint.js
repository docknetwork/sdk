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
    super(type, origins);
  }
}

function createServiceType(type) {
  if (typeof type === 'string') {
    switch (type) {
      case 'LinkedDomains':
        return new LinkedDomains();
      case 'DIDCommMessaging':
        return new DIDCommMessaging();
      default:
        throw new Error(`Unknown service type: ${type}`);
    }
  } else if (type instanceof LinkedDomains || type instanceof DIDCommMessaging) {
    return type;
  } else {
    throw new Error(`Invalid service type: ${type}`);
  }
}

function processDIDCommOrigins(origins) {
  if (!Array.isArray(origins)) {
    return origins;
  }

  const processedOrigins = new ServiceEndpointOrigins();
  origins.forEach((origin) => {
    if (typeof origin === 'string') {
      processedOrigins.push(new ServiceEndpointOrigin(origin));
    } else if (origin && typeof origin === 'object') {
      const jsonString = JSON.stringify({
        uri: origin.uri,
        accept: origin.accept || [],
        routingKeys: origin.routingKeys || [],
      });
      processedOrigins.push(new ServiceEndpointOrigin(jsonString));
    } else {
      processedOrigins.push(origin);
    }
  });
  return processedOrigins;
}

export function createServiceEndpoint(type, origins) {
  const serviceType = createServiceType(type);

  if (serviceType instanceof LinkedDomains) {
    return new ServiceEndpoint(serviceType, origins);
  }

  if (serviceType instanceof DIDCommMessaging) {
    const processedOrigins = processDIDCommOrigins(origins);

    const instance = Object.create(ServiceEndpoint.prototype);
    instance.types = serviceType;
    instance.origins = processedOrigins;
    Object.seal(instance);
    return instance;
  }

  throw new Error(`Unsupported service type: ${serviceType}`);
}

function mapServiceEndpoint(endpoint) {
  try {
    return JSON.parse(endpoint);
  } catch (error) {
    return endpoint; // If it's not valid JSON, return as string
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

  constructor(id, type, serviceEndpoint) {
    super(id, type, serviceEndpoint);
  }

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.types, serviceEndpoint.origins);
  }

  toJSON() {
    const result = {
      id: this.id.toJSON(),
      type: this.type.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };

    if (this.type instanceof DIDCommMessaging) {
      result.serviceEndpoint = result.serviceEndpoint.map(mapServiceEndpoint);
    }

    return result;
  }

  // eslint-disable-next-line no-use-before-define
  toCheqd(Class = CheqdService) {
    let processedServiceEndpoint = this.serviceEndpoint;

    if (this.type instanceof DIDCommMessaging) {
      const originalArray = this.serviceEndpoint.toJSON();
      const serializedArray = originalArray.map((endpoint) => {
        if (typeof endpoint === 'string') {
          return endpoint;
        } else if (endpoint && typeof endpoint === 'object') {
          return JSON.stringify({
            uri: endpoint.uri,
            accept: endpoint.accept || [],
            routingKeys: endpoint.routingKeys || [],
          });
        } else {
          return endpoint;
        }
      });
      processedServiceEndpoint = serializedArray;
    }

    // eslint-disable-next-line no-use-before-define
    return new (ensureEqualToOrPrototypeOf(CheqdService, Class))(
      this.id,
      this.type,
      processedServiceEndpoint,
    );
  }
}

export class DIDCommService extends TypedStruct {
  static Classes = {
    id: ServiceEndpointId,
    type: ServiceEndpointType,
    serviceEndpoint: class ServiceEndpoints extends TypedArray {
      static Class = class ServiceEndpointString extends TypedString {};
    },
  };

  constructor(id, type, serviceEndpoint) {
    super(id, type, serviceEndpoint);
  }

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

  constructor(id, serviceType, serviceEndpoint) {
    // Handle string serviceType values by converting them to ServiceEndpointType instances
    let processedServiceType = serviceType;
    if (typeof serviceType === 'string') {
      processedServiceType = ServiceEndpointType.from(serviceType);
    }

    super(id, processedServiceType, serviceEndpoint);

    if (processedServiceType instanceof DIDCommMessaging && Array.isArray(serviceEndpoint)) {
      const ServiceEndpointArray = this.constructor.Classes.serviceEndpoint;
      const processedServiceEndpoint = new ServiceEndpointArray();

      serviceEndpoint.forEach((endpoint) => {
        processedServiceEndpoint.push(endpoint);
      });

      this.serviceEndpoint = processedServiceEndpoint;
    }
  }

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.serviceType, serviceEndpoint.serviceEndpoint);
  }

  toJSON() {
    const result = {
      id: this.id.toJSON(),
      type: this.serviceType.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };

    if (this.serviceType instanceof DIDCommMessaging) {
      result.serviceEndpoint = result.serviceEndpoint.map(mapServiceEndpoint);
    }

    return result;
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
