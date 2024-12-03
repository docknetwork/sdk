import {
  TypedStruct, TypedArray, TypedString, withFrom,
} from '../../generic';
import { LinkedDomains } from '../offchain';
import IdentRef from './ident-ref';
import { isBytes } from '../../../utils/type-helpers';

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
