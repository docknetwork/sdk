import { MultiResolver } from '../generic';

const SOURCE = '([a-zA-Z0-9_.-]+)';
const HEX_ID = '(0[xX][0-9a-fA-F]+)';
const STATUS_LIST_ID_MATCHER = new RegExp(
  `^status-list2021:${SOURCE}:${HEX_ID}$`,
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
    if (statusListId) {
      const sections = statusListId.match(STATUS_LIST_ID_MATCHER);
      if (sections) {
        const [, , id] = sections;

        return id;
      }
    }

    throw new Error(
      `Invalid \`StatusList2021Credential\` id: \`${statusListId}\``,
    );
  }
}
