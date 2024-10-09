import {
  TypedStruct, option, TypedNumber, TypedString,
} from '../generic';

export class Iri extends TypedString {}

export class Attest extends TypedStruct {
  static Classes = {
    priority: class Priority extends TypedNumber {},
    iri: option(Iri),
  };
}
