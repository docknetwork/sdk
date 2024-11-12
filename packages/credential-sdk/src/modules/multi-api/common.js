import { ensureArray, ensureInstanceOf, fmtIter } from '../../utils';

export function injectModuleRouter(klass) {
  const name = `withModuleRouter(${klass.name})`;

  const classes = {
    [name]: class extends klass {
      constructor(modules) {
        super();

        for (const module of ensureArray(modules)) {
          ensureInstanceOf(module, klass);
        }

        this.modules = modules;
      }

      moduleById(id) {
        for (const module of this.modules) {
          if (module.supportsIdentifier(id)) {
            return module;
          }
        }

        throw new Error(
          `Identifier \`${id}\` is not supported by any of ${fmtIter(
            this.modules.map((module) => module.constructor.name),
          )}`,
        );
      }

      dispatchById(id, fn) {
        return fn(this.moduleById(id));
      }

      supportsIdentifier(id) {
        return this.modules.some((module) => module.supportsIdentifier(id));
      }

      methods() {
        return this.modules.flatMap((module) => module.methods());
      }
    },
  };

  return classes[name];
}
