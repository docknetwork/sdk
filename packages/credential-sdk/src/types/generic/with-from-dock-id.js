import { DockDid } from "../did/onchain/typed-did";
import TypedUUID from "./typed-uuid";
import withFrom from "./with-from";

export default function withFromDockId(klass, fromClass, prefix) {
  return withFrom(klass, (value, from) =>
    from(
      value instanceof fromClass
        ? TypedUUID.fromDockIdent(value, prefix)
        : value
    )
  );
}

export function patchWithFromDock(klass, Type, mapping) {
  const { from } = klass;

  // eslint-disable-next-line no-param-reassign
  klass.from = function fromFn(value) {
    if (value instanceof Type) {
      return new this(this.Class.from(value));
    } else {
      return from.call(this, value);
    }
  };

  const { from: from1 } = klass.Class;

  // eslint-disable-next-line no-param-reassign
  klass.Class.from = function fromFn(value) {
    let id;
    if (value instanceof Type) {
      const hexId = value.toEncodedString();
      const dockDid = mapping.testnet[hexId] ?? mapping.mainnet[hexId];
      if (dockDid == null) {
        throw new Error(`Dock DID not found for ${hexId}`);
      }

      id = [DockDid.from(dockDid), value];
    } else {
      id = value;
    }

    return from1.call(this, id);
  };
}
