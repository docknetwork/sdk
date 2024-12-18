import { maybeToJSONString, maybeToNumber } from "../../../utils";
import {
  TypedStruct,
  TypedString,
  TypedArray,
  TypedEnum,
  createPlaceholder,
  TypedMap,
  Any,
} from "../../generic";

const LinkedDomainsPlaceholder = createPlaceholder((value) => {
  if (
    +maybeToNumber(value) === 0b0001 ||
    String(value) === "LinkedDomains" ||
    value == null
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
  static Type = "LinkedDomains";

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

export class ServiceEndpoints extends TypedMap {
  static KeyClass = Any;

  static ValueClass = ServiceEndpoint;
}
