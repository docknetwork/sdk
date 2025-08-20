/* eslint no-use-before-define: 0 */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-all-duplicated-branches */

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
  TypedNumber,
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

ServiceEndpointType.bindVariants(LinkedDomains, DIDCommMessaging);

export class ServiceEndpointOrigin extends TypedString {}

export class ServiceEndpointOrigins extends TypedArray {
  static Class = ServiceEndpointOrigin;
}

export class DIDCommServiceEndpoint extends TypedStruct {
  static Classes = {
    uri: TypedString,
    accept: class AcceptArray extends TypedArray {
      static Class = TypedString;
    },
    routingKeys: class RoutingKeysArray extends TypedArray {
      static Class = TypedString;
    },
    recipientKeys: class RecipientKeysArray extends TypedArray {
      static Class = TypedString;
    },
    priority: class PriorityNumber extends TypedNumber { },
  };

  constructor(uri, accept = [], routingKeys = [], recipientKeys = [], priority = 0) {
    super(uri, accept, routingKeys, recipientKeys, priority);
  }

  toJSON() {
    return {
      uri: this.uri.toJSON(),
      accept: this.accept.toJSON(),
      routingKeys: this.routingKeys.toJSON(),
      recipientKeys: this.recipientKeys.toJSON(),
      priority: this.priority.toJSON(),
    };
  }

  static from(value) {
    if (typeof value === 'string') {
      return new DIDCommServiceEndpoint(value, [], []);
    } else if (value && typeof value === 'object') {
      const uri = value.uri || '';
      const accept = Array.isArray(value.accept) ? value.accept : [];
      const routingKeys = Array.isArray(value.routingKeys) ? value.routingKeys : [];
      const recipientKeys = Array.isArray(value.recipientKeys) ? value.recipientKeys : [];
      const priority = value.priority !== undefined ? value.priority : 0;
      return new DIDCommServiceEndpoint(uri, accept, routingKeys, recipientKeys, priority);
    } else {
      throw new Error(`Invalid DIDComm service endpoint: ${value}`);
    }
  }
}

export class DIDCommServiceEndpoints extends TypedArray {
  static Class = DIDCommServiceEndpoint;
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

  const processedOrigins = new DIDCommServiceEndpoints();
  origins.forEach((origin) => {
    if (typeof origin === 'string') {
      // Simple URI string
      processedOrigins.push(DIDCommServiceEndpoint.from({ uri: origin }));
    } else if (origin && typeof origin === 'object') {
      // Complex DIDComm object
      processedOrigins.push(DIDCommServiceEndpoint.from(origin));
    } else {
      throw new Error(`Invalid DIDComm origin: ${origin}`);
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
    // For DIDComm services, use a specialized class
    if (serviceEndpoint.types instanceof DIDCommMessaging) {
      return DIDCommService.fromServiceEndpoint(id, serviceEndpoint);
    }

    return new this(id, serviceEndpoint.types, serviceEndpoint.origins);
  }

  static from(value) {
    // If it's already a Service instance, return it
    if (value instanceof Service) {
      return value;
    }

    // If it's a DIDCommService instance, return it as-is (don't convert)
    if (value instanceof DIDCommService) {
      return value;
    }

    // Otherwise, use the parent TypedStruct.from method
    return super.from(value);
  }

  toJSON() {
    const result = {
      id: this.id.toJSON(),
      type: this.type.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };

    // For DIDComm services, convert the structured data to objects
    if (this.type instanceof DIDCommMessaging) {
      result.serviceEndpoint = result.serviceEndpoint.map((endpoint) => {
        if (typeof endpoint === 'string') {
          // If it's a string, it might be a simple URI
          return {
            uri: endpoint, accept: [], routingKeys: [], recipientKeys: [], priority: 0,
          };
        }
        return endpoint;
      });
    }

    return result;
  }

  // eslint-disable-next-line no-use-before-define
  toCheqd(Class = CheqdService) {
    let processedServiceEndpoint = this.serviceEndpoint;

    if (this.type instanceof DIDCommMessaging) {
      const originalArray = this.serviceEndpoint.toJSON();
      const processedArray = originalArray.map((endpoint) => {
        if (typeof endpoint === 'string') {
          // Try to parse JSON string and convert to structured object
          try {
            const parsed = JSON.parse(endpoint);
            if (parsed && typeof parsed === 'object' && parsed.uri) {
              return {
                uri: parsed.uri || '',
                accept: parsed.accept || [],
                routingKeys: parsed.routingKeys || [],
                recipientKeys: parsed.recipientKeys || [],
                priority: parsed.priority || 0,
              };
            }
          } catch {
            // If parsing fails, return as-is
          }
          return endpoint;
        } else if (endpoint && typeof endpoint === 'object') {
          // For DIDComm objects, pass them as structured objects, not JSON strings
          return {
            uri: endpoint.uri || '',
            accept: endpoint.accept || [],
            routingKeys: endpoint.routingKeys || [],
            recipientKeys: endpoint.recipientKeys || [],
            priority: endpoint.priority || 0,
          };
        } else {
          return endpoint;
        }
      });
      processedServiceEndpoint = processedArray;
    }

    // eslint-disable-next-line no-use-before-define
    return new (ensureEqualToOrPrototypeOf(CheqdService, Class))(
      this.id,
      this.type,
      processedServiceEndpoint,
    );
  }
}

export class DIDCommServiceEndpointValue {
  constructor(value) {
    this.value = value;
  }

  eq(other) {
    const thisJSON = JSON.stringify({
      ...this.toJSON(),
      id: undefined,
    });
    const otherJSON = JSON.stringify({
      ...other.toJSON(),
      id: undefined,
    });
    return thisJSON === otherJSON;
  }

  toJSON() {
    return this.value;
  }

  static from(value) {
    return new this(value);
  }
}

export class DIDCommServiceEndpointsArray extends TypedArray {
  static Class = DIDCommServiceEndpointValue;
}

export class DIDCommService extends TypedStruct {
  static Classes = {
    id: ServiceEndpointId,
    type: ServiceEndpointType,
    serviceEndpoint: DIDCommServiceEndpointsArray,
  };

  constructor(id, type, serviceEndpoint) {
    super(id, type, serviceEndpoint);
  }

  static fromServiceEndpoint(id, serviceEndpoint) {
    // Convert DIDCommServiceEndpoints to a format that DIDCommService can handle
    const convertedEndpoints = [];
    serviceEndpoint.origins.forEach((origin) => {
      if (origin instanceof DIDCommServiceEndpoint) {
        // Convert the structured endpoint to a proper object
        const endpointObj = {
          uri: origin.uri.toJSON(),
          accept: origin.accept.toJSON(),
          routingKeys: origin.routingKeys.toJSON(),
          recipientKeys: origin.recipientKeys.toJSON(),
          priority: origin.priority.toJSON(),
        };
        convertedEndpoints.push(endpointObj);
      } else {
        convertedEndpoints.push(origin);
      }
    });

    return new this(id, serviceEndpoint.types, convertedEndpoints);
  }

  toCheqd(Class = CheqdService) {
    // Process the serviceEndpoint to ensure it's in the right format
    let processedServiceEndpoint = this.serviceEndpoint;

    // Convert the serviceEndpoint to a format that CheqdService can handle
    if (Array.isArray(this.serviceEndpoint) && typeof this.serviceEndpoint.map === 'function') {
      const processedArray = this.serviceEndpoint.map((endpoint) => {
        if (typeof endpoint === 'string') {
          // Try to parse JSON string and convert to structured object
          try {
            const parsed = JSON.parse(endpoint);
            if (parsed && typeof parsed === 'object' && parsed.uri) {
              return {
                uri: parsed.uri || '',
                accept: parsed.accept || [],
                routingKeys: parsed.routingKeys || [],
                recipientKeys: parsed.recipientKeys || [],
                priority: parsed.priority || 0,
              };
            }
          } catch {
            // If parsing fails, return as-is
          }
          return endpoint;
        } else if (endpoint && typeof endpoint === 'object') {
          // For DIDComm objects, pass them as structured objects, not JSON strings
          return {
            uri: endpoint.uri || '',
            accept: endpoint.accept || [],
            routingKeys: endpoint.routingKeys || [],
            recipientKeys: endpoint.recipientKeys || [],
            priority: endpoint.priority || 0,
          };
        } else {
          return endpoint;
        }
      });
      processedServiceEndpoint = processedArray;
    } else if (this.serviceEndpoint && typeof this.serviceEndpoint.toJSON === 'function') {
      // Handle TypedArray (DIDCommServiceEndpoints)
      const endpoints = this.serviceEndpoint.toJSON();
      if (Array.isArray(endpoints)) {
        const processedArray = endpoints.map((endpoint) => {
          if (typeof endpoint === 'string') {
            // Try to parse JSON string and convert to structured object
            try {
              const parsed = JSON.parse(endpoint);
              if (parsed && typeof parsed === 'object' && parsed.uri) {
                return {
                  uri: parsed.uri || '',
                  accept: parsed.accept || [],
                  routingKeys: parsed.routingKeys || [],
                  recipientKeys: parsed.recipientKeys || [],
                  priority: parsed.priority || 0,
                };
              }
            } catch {
            // If parsing fails, return as-is
            }
            return endpoint;
          } else if (endpoint && typeof endpoint === 'object') {
          // For DIDComm objects, pass them as structured objects, not JSON strings
            return {
              uri: endpoint.uri || '',
              accept: endpoint.accept || [],
              routingKeys: endpoint.routingKeys || [],
              recipientKeys: endpoint.recipientKeys || [],
              priority: endpoint.priority || 0,
            };
          } else {
            return endpoint;
          }
        });
        processedServiceEndpoint = processedArray;
      }
    }

    // eslint-disable-next-line no-use-before-define
    return new (ensureEqualToOrPrototypeOf(CheqdService, Class))(
      this.id,
      this.type,
      processedServiceEndpoint,
    );
  }
}

export class ServiceEndpointValue {
  constructor(value) {
    // Store the value directly without any conversion
    this.value = value;
  }

  toJSON() {
    return this.value;
  }

  static from(value) {
    return new this(value);
  }
}

export class ServiceEndpointsType extends TypedArray {
  static Class = ServiceEndpointValue;
}

export class CheqdService extends withFrom(
  TypedStruct,
  function from(value, fromFn) {
    if (value instanceof Service) {
      return fromFn(value.toCheqd(this));
    }

    if (value instanceof DIDCommService) {
      return fromFn(value.toCheqd(this));
    }

    // Handle flattened format from blockchain for DIDComm services
    if (value && typeof value === 'object' && value.serviceType === 'DIDCommMessaging' && value.accept && value.routingKeys) {
      // Reconstruct the structured format from the flattened format
      const reconstructedEndpoints = value.serviceEndpoint.map((uri) => ({
        uri,
        accept: value.accept || [],
        routingKeys: value.routingKeys || [],
        recipientKeys: value.recipientKeys || [],
        priority: value.priority || 0,
      }));

      const reconstructedValue = {
        id: value.id,
        serviceType: value.serviceType,
        serviceEndpoint: reconstructedEndpoints,
      };

      return fromFn(reconstructedValue);
    }

    return fromFn(value);
  },
) {
  static Classes = {
    id: CheqdServiceEndpointId,
    serviceType: ServiceEndpointType,
    serviceEndpoint: ServiceEndpointsType,
  };

  constructor(id, serviceType, serviceEndpoint) {
    // Handle string serviceType values by converting them to ServiceEndpointType instances
    let processedServiceType = serviceType;
    if (typeof serviceType === 'string') {
      processedServiceType = ServiceEndpointType.from(serviceType);
    }

    super(id, processedServiceType, serviceEndpoint);

    // For DIDComm services, ensure the serviceEndpoint is properly wrapped
    if (processedServiceType instanceof DIDCommMessaging && Array.isArray(serviceEndpoint)) {
      const ServiceEndpointArray = this.constructor.Classes.serviceEndpoint;
      const processedServiceEndpoint = new ServiceEndpointArray();

      serviceEndpoint.forEach((endpoint) => {
        if (typeof endpoint === 'string') {
          processedServiceEndpoint.push(endpoint);
        } else if (endpoint && typeof endpoint === 'object') {
          // Store the structured object directly
          processedServiceEndpoint.push(endpoint);
        } else {
          processedServiceEndpoint.push(endpoint);
        }
      });

      this.serviceEndpoint = processedServiceEndpoint;
    }
  }

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.serviceType, serviceEndpoint.serviceEndpoint);
  }

  static fromCheqdPayload(payload) {
    // Handle the case where the payload comes back in flattened format from the blockchain
    if (payload.serviceType === 'DIDCommMessaging' && payload.accept && payload.routingKeys) {
      // Reconstruct the structured format from the flattened format
      const reconstructedEndpoints = payload.serviceEndpoint.map((uri) => ({
        uri,
        accept: payload.accept || [],
        routingKeys: payload.routingKeys || [],
        recipientKeys: payload.recipientKeys || [],
        priority: payload.priority || 0,
      }));

      return new this(payload.id, payload.serviceType, reconstructedEndpoints);
    }

    // For other service types or non-flattened format, use the regular constructor
    return new this(payload.id, payload.serviceType, payload.serviceEndpoint);
  }

  toJSON() {
    const result = {
      id: this.id.toJSON(),
      type: this.serviceType.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };

    // For DIDComm services, ensure endpoints are in object format
    if (this.serviceType instanceof DIDCommMessaging) {
      result.serviceEndpoint = result.serviceEndpoint.map((endpoint) => {
        if (typeof endpoint === 'string') {
          try {
            const parsed = JSON.parse(endpoint);
            // Ensure the parsed object has the expected structure
            return {
              uri: parsed.uri || endpoint,
              accept: parsed.accept || [],
              routingKeys: parsed.routingKeys || [],
              recipientKeys: parsed.recipientKeys || [],
              priority: parsed.priority || 0,
            };
          } catch (error) {
            return { uri: endpoint, accept: [], routingKeys: [] };
          }
        } else if (endpoint && typeof endpoint === 'object') {
          // Already an object, ensure it has the expected structure
          return {
            uri: endpoint.uri || '',
            accept: endpoint.accept || [],
            routingKeys: endpoint.routingKeys || [],
            recipientKeys: endpoint.recipientKeys || [],
            priority: endpoint.priority || 0,
          };
        } else {
          return { uri: String(endpoint), accept: [], routingKeys: [] };
        }
      });
    }

    return result;
  }

  toCheqdPayload() {
    const result = {
      id: this.id.toJSON(),
      serviceType: this.serviceType.toJSON(),
      serviceEndpoint: this.serviceEndpoint.toJSON(),
    };

    // For DIDComm services, provide the flattened structure expected by downstream
    if (this.serviceType instanceof DIDCommMessaging) {
      const uris = [];
      const accepts = [];
      const routingKeys = [];
      const recipientKeys = [];

      result.serviceEndpoint.forEach((endpoint) => {
        if (typeof endpoint === 'string') {
          try {
            const parsed = JSON.parse(endpoint);
            uris.push(parsed.uri);
            accepts.push(...(parsed.accept || []));
            routingKeys.push(...(parsed.routingKeys || []));
            recipientKeys.push(...(parsed.recipientKeys || []));
          } catch {
            uris.push(endpoint);
          }
        } else if (endpoint && typeof endpoint === 'object') {
          // Handle structured object directly
          uris.push(endpoint.uri || '');
          accepts.push(...(endpoint.accept || []));
          routingKeys.push(...(endpoint.routingKeys || []));
          recipientKeys.push(...(endpoint.recipientKeys || []));
        } else {
          uris.push(endpoint);
        }
      });

      // Return the flattened structure expected by downstream
      return {
        id: result.id,
        serviceType: result.serviceType,
        serviceEndpoint: uris,
        accept: accepts,
        routingKeys,
        recipientKeys,
        priority: 0, // Default priority
      };
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
