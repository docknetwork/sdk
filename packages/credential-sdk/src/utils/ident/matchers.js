/**
 * `RegExp` pattern to match the `METHOD`.
 */
const METHOD_PATTERN = '([a-zA-Z0-9_]+)';
/**
 * `RegExp` pattern for the hex identifier `0x...`.
 */
const HEX_ID_REG_EXP_PATTERN = '(0x[0-9a-fA-F]+)';

const UUID_PATTERN = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

const DATETIME_PATTERN = '^(\\d{4})-(0[1-9]|1[0-2])-'
  + '(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):'
  + '([0-5][0-9]):([0-5][0-9]|60)'
  + '(\\.[0-9]+)?(Z|(\\+|-)([01][0-9]|2[0-3]):'
  + '([0-5][0-9]))$';

const ID_CHAR = '[a-zA-Z0-9_.-]';
const METHOD_ID = `(${ID_CHAR}+(:${ID_CHAR}+)*)`;
const PARAM_CHAR = '[a-zA-Z0-9_.:%-]';
const PARAM = `;${PARAM_CHAR}+=${PARAM_CHAR}*`;
const PARAMS = `((${PARAM})*)`;
// eslint-disable-next-line no-useless-escape
const PATH = '(/[^#?]*)?';
const QUERY = '([?][^#]*)?';
// eslint-disable-next-line no-useless-escape
const FRAGMENT = '(#.*)?';

export const DID_MATCHER = new RegExp(
  `^did:${METHOD_PATTERN}:${METHOD_ID}${PARAMS}${PATH}${QUERY}${FRAGMENT}$`,
);

export const DATETIME_MATCHER = new RegExp(DATETIME_PATTERN, 'i');

export const STATUS_LIST_ID_MATCHER = new RegExp(
  `status-list2021:${METHOD_PATTERN}:((?:testnet|mainnet):${UUID_PATTERN}|${HEX_ID_REG_EXP_PATTERN})(?::${UUID_PATTERN})?`,
);

export const PRIVATE_STATUS_LIST_ID_MATCHER = new RegExp(
  `^private-status-list2021:${HEX_ID_REG_EXP_PATTERN}$`,
);

export const URI_MATCHER = new RegExp('^\\w+:\\/?\\/?[^\\s]+$');
