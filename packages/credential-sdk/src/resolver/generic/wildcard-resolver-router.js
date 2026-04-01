import ResolverRouter from './resolver-router';
import { WILDCARD } from './const';

/**
 * Wildcard `prefix`/`method` resolver. Used primarily as a router to combine different resolvers together.
 */
export default class WildcardResolverRouter extends ResolverRouter {
  prefix = WILDCARD;

  method = WILDCARD;
}
