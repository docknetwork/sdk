import { MultiResolver, METHOD_REG_EXP_PATTERN, HEX_ID_REG_EXP_PATTERN } from '../generic';

const STATUS_LIST_ID_MATCHER = new RegExp(
  `^status-list2021:${METHOD_REG_EXP_PATTERN}:${HEX_ID_REG_EXP_PATTERN}$`,
);

/**
 * A `StatusList2021Credential` resolver.
 * Accepts identifiers in format `status-list2021:`.
 *
 * @abstract
 */
export default class StatusList2021Resolver extends MultiResolver {
  static PREFIX = 'status-list2021';

  parse(statusListId) {
    if (statusListId === '' || !statusListId) throw new Error('Missing `statusListId`');

    if (statusListId) {
      const sections = statusListId.match(STATUS_LIST_ID_MATCHER);
      if (sections) {
        const [, method, id] = sections;

        return { method, id };
      }
    }

    throw new Error(
      `Invalid \`StatusList2021Credential\` id: \`${statusListId}\``,
    );
  }
}
