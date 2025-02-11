import { withQualifier, TypedTuple, TypedString } from "../../generic";
import { NamespaceDid } from "../onchain/typed-did";

export default class IdentRef extends withQualifier(TypedTuple) {
  static Qualifier = "";

  static Did = NamespaceDid;

  static Ident = TypedString;

  static get Classes() {
    return [this.Did, this.Ident];
  }

  static random(did) {
    return new this(did, this.Ident.random());
  }

  get did() {
    return this[0];
  }

  get value() {
    return this[1];
  }

  static fromUnqualifiedString(str) {
    const regex = new RegExp(`^${this.Qualifier}([^#]+)#(.+)$`);
    const match = str.match(regex);

    if (!match) {
      throw new Error(`Invalid format for IdentRef: \`${str}\``);
    }

    const [, did, value] = match;
    return new this(did, value);
  }

  toEncodedString() {
    const { did, value } = this;

    return `${did}#${value}`;
  }

  toCheqdPayload() {
    return this.toString();
  }

  toJSON() {
    return this.toString();
  }
}
