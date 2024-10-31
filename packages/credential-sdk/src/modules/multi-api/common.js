import { ensureInstanceOf, ensureIterable } from '../../utils';

export function injectModuleRouter(klass) {
  const name = `withModuleRouter(${klass.name})`;

  const classes = {
    [name]: class extends klass {
      constructor(modules) {
        super();

        for (const module of ensureIterable(modules)) {
          ensureInstanceOf(module, klass);
        }

        this.modules = modules;
      }

      moduleById(id) {
        for (const module of this.modules) {
          return module;
        }

        throw new TypeError(`Unexpected identifier received: \`${id}\``);
      }

      dispatchById(id, fn) {
        return fn(this.moduleById(id));
      }

      methods() {
        return this.modules.flatMap((module) => module.methods());
      }
    },
  };

  return classes[name];
}
