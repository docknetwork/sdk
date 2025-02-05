import { maybeToJSONString, maybeToNumber } from '../../../utils';
import {
  TypedStruct,
  TypedString,
  TypedArray,
  TypedEnum,
  createPlaceholder,
  TypedMap,
  withFrom,
} from '../../generic';
import IdentRef from './ident-ref';
import { isBytes } from '../../../utils/type-helpers';

export class ServiceEndpointId extends IdentRef {}

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
      static Class = class ServiceEndpointString extends TypedString {};
    },
  };

  static fromServiceEndpoint(id, serviceEndpoint) {
    return new this(id, serviceEndpoint.type, serviceEndpoint.origins);
  }
}

export class ServiceEndpoints extends TypedMap {
  static KeyClass = ServiceEndpointId;

  static ValueClass = ServiceEndpoint;
}
