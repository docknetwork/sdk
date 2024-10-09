import { NotAConstructor } from '../../utils/interfaces';

/**
 * Creates a typed placeholder that implements `from`/`fromJSON`/`fromApi` and creates a value from the supplied
 * argument using `makePlacholder` function.
 *
 * @template P
 * @param {function(*): P} makePlaceholder
 * @returns {function(*): P}
 */
export default function createPlaceholder(makePlaceholder) {
  const name = `placeholder(${makePlaceholder.name})`;
  const obj = {
    [name]: (...args) => makePlaceholder(...args),
  };

  obj[name][NotAConstructor] = true;
  obj[name].from = obj[name];
  obj[name].fromApi = obj[name];
  obj[name].fromJSON = obj[name];

  return obj[name];
}
