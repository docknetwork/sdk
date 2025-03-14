/**
 * Regular expression pattern to match a method identifier composed of
 * letters (a-z, A-Z), digits (0-9), and underscores (_)
 */
const METHOD_PATTERN = '([a-za-z0-9_]+)';

/**
 * Regular expression pattern to match a hexadecimal identifier that starts with 0x
 * followed by one or more hex characters (0-9, a-f, case insensitive)
 */
const HEX_ID_REG_EXP_PATTERN = '(0x[0-9a-fA-F]+)';

/**
 * Regular expression pattern to validate UUIDs in the format:
 * 8 hex digits - 4 hex digits - 4 hex digits - 4 hex digits - 12 hex digits
 */
const UUID_PATTERN = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

/**
 * Regular expression pattern to match ISO 8601 datetime strings in the format:
 * YYYY-MM-DDTHH:mm:ss.SSSZ or with timezone offset (+HH:MM)
 */
const DATETIME_PATTERN = '^(\\d{4})-(0[1-9]|1[0-2])-'
  + '(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):'
  + '([0-5][0-9]):([0-5][0-9]|60)'
  + '(\\.[0-9]+)?(Z|(\\+|-)([01][0-9]|2[0-3]):'
  + '([0-5][0-9]))$';

/**
 * Character set for valid identifier characters: letters, digits, underscores,
 * periods, colons, and hyphens
 */
const ID_CHAR = '[a-zA-Z0-9_.-]';

/**
 * Pattern for matching method IDs which consist of one or more ID characters,
 * optionally followed by colon-separated segments of ID characters
 */
const METHOD_ID = `(${ID_CHAR}+(:${ID_CHAR}+)*)`;

/**
 * Character set allowed in parameters: letters, digits, underscores,
 * periods, colons, percent signs, and hyphens
 */
const PARAM_CHAR = '[a-zA-Z0-9_.:%-]';

/**
 * Pattern for matching a single parameter in the format key=value
 */
const PARAM = `;${PARAM_CHAR}+=${PARAM_CHAR}*`;

/**
 * Pattern for matching zero or more parameters
 */
const PARAMS = `((${PARAM})*)`;

/**
 * Pattern for matching an optional path segment, starting with a slash
 */
const PATH = '(/[^#?]*)?';

/**
 * Pattern for matching an optional query string (starting with ?)
 */
const QUERY = '([?][^#]*)?';

/**
 * Pattern for matching an optional fragment identifier (starting with #)
 */
const FRAGMENT = '(#.*)?';

/**
 * Regular expression to validate decentralized identifiers (DIDs) in the format:
 * did:method:suffix[:params][path][query][fragment]
 */
export const DID_MATCHER = new RegExp(
  `^did:${METHOD_PATTERN}:${METHOD_ID}${PARAMS}${PATH}${QUERY}${FRAGMENT}$`,
);

/**
 * Regular expression to match ISO 8601 datetime strings with optional
 * milliseconds and timezone information (case insensitive)
 */
export const DATETIME_MATCHER = new RegExp(DATETIME_PATTERN, 'i');

/**
 * Regular expression to match status list IDs in the format:
 * status-list2021:method:testnet|mainnet:uuid or status-list2021:hex-id
 */
export const STATUS_LIST_ID_MATCHER = new RegExp(
  `status-list2021:${METHOD_PATTERN}:((?:testnet|mainnet):${UUID_PATTERN}|${HEX_ID_REG_EXP_PATTERN})(?::${UUID_PATTERN})?`,
);

/**
 * Regular expression to match private status list IDs in the format:
 * private-Status-list2021:hex-id
 */
export const PRIVATE_STATUS_LIST_ID_MATCHER = new RegExp(
  `^private-status-list2021:${HEX_ID_REG_EXP_PATTERN}$`,
);

/**
 * Regular expression to validate URIs with scheme, optional slashes,
 * and path (cannot contain whitespace)
 */
export const URI_MATCHER = new RegExp('^\\w+:\\/?\\/?[^\\s]+$');
