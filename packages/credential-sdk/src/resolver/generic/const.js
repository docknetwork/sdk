/**
 * `RegExp` pattern to match the `METHOD`.
 */
export const METHOD_REG_EXP_PATTERN = '([a-zA-Z0-9_]+)';

/**
 * `RegExp` pattern for the hex identifier `0x...`.
 */
export const HEX_ID_REG_EXP_PATTERN = '(0x[0-9a-fA-F]+)';

/**
 * Use to specify `prefix`/`method` that will be dispatched in case no direct matches are found.
 */
export const WILDCARD = Symbol.for(
  '@docknetwork/credential-sdk/resolver/wildcard-resolver',
);
