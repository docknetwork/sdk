import MultiResolver from './multi-resolver';
import { WILDCARD } from './const';

/**
 * Wildcard `PREFIX`/`METHOD` resolver. Used primarily as a router to combine different resolvers together.
 */
export default class WildcardMultiResolver extends MultiResolver {
  static PREFIX = WILDCARD;
  static METHOD = WILDCARD;
}
