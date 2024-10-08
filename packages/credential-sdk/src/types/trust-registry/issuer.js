import { DockDidOrDidMethodKey } from '../did';
import {
  TypedMap, TypedNumber, TypedSet, TypedString,
} from '../generic';

export class VerificationPrices extends TypedMap {
  static KeyClass = TypedString;

  static ValueClass = TypedNumber;
}

export class Issuer extends DockDidOrDidMethodKey {}

export class IssuersSet extends TypedSet {
  static Class = Issuer;
}

export class Issuers extends TypedMap {
  static KeyClass = Issuer;

  static ValueClass = VerificationPrices;
}
