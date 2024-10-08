import { DockDidOrDidMethodKey } from '../did';
import { TypedSet } from '../generic';

export class Verifier extends DockDidOrDidMethodKey {}

export class Verifiers extends TypedSet {
  static Class = Verifier;
}
