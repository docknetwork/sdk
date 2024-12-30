import { parse, validate, stringify, v4 } from "uuid";
import { sha256 } from "js-sha256";
import TypedBytes from "./typed-bytes";
import { normalizeOrConvertStringToU8a, valueNumberOrBytes } from "../../utils";

export default class TypedUUID extends TypedBytes {
  constructor(id) {
    super(validate(id) ? parse(id) : id);

    if (!validate(this.value)) {
      throw new Error(`Invalid UUID: ${this.value}`);
    }
  }

  get value() {
    return stringify(this.bytes);
  }

  toString() {
    return this.value;
  }

  toJSON() {
    return String(this);
  }

  static fromDockIdent(dockIdent, prefix = []) {
    const prefixBytes = normalizeOrConvertStringToU8a(prefix);
    const identBytes = valueNumberOrBytes(dockIdent);
    const hash = sha256.digest([...prefixBytes, ...identBytes]);

    return this.fromBytesAdapt(hash);
  }

  static fromBytesAdapt(bytesOrString) {
    let bytes = normalizeOrConvertStringToU8a(bytesOrString);
    if (bytes.length < 16) {
      const newBytes = new Uint8Array(16);
      newBytes.set(bytes);
      newBytes.fill(0, bytes.length);

      bytes = newBytes;
    } else if (bytes.length > 16) {
      bytes = bytes.slice(0, 16);
    }

    // eslint-disable-next-line no-bitwise
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // eslint-disable-next-line no-bitwise
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return new this(bytes);
  }

  static random() {
    return new this(v4());
  }
}
