import { DockDid } from '../did/onchain/typed-did';
import anyOf from './any-of';
import TypedUUID from './typed-uuid';
import withFrom from './with-from';

export default function withFromDockId(klass, fromClass, prefix) {
  return withFrom(klass, (value, from) => {
    const parsedValue = anyOf(klass, fromClass).from(value);

    return from(
      parsedValue instanceof fromClass
        ? TypedUUID.fromDockIdent(parsedValue, prefix)
        : parsedValue,
    );
  });
}

export function patchWithFromDock(klass, Type, mapping) {
  const { from } = klass;
  const { from: from1 } = klass.Class;

  class FromClass extends klass {
    static from = from;
  }
  class FromClassClass extends klass.Class {
    static from = from1;
  }

  // eslint-disable-next-line no-param-reassign
  klass.from = function fromFn(value) {
    const parsedValue = anyOf(FromClass, Type).from(value);

    if (parsedValue instanceof Type) {
      return new this(this.Class.from(parsedValue));
    } else {
      return from.call(this, parsedValue);
    }
  };

  // eslint-disable-next-line no-param-reassign
  klass.Class.from = function fromFn(value) {
    let id = anyOf(FromClassClass, Type).from(value);
    if (id instanceof Type) {
      const hexId = id.toEncodedString();
      const dockDid = mapping.mainnet[hexId] ?? mapping.testnet[hexId];
      if (dockDid == null) {
        throw new Error(
          `Dock DID not found for ${hexId} - can't create ${this.name}`,
        );
      }

      id = [DockDid.from(dockDid), id];
    }

    return from1.call(this, id);
  };
}
