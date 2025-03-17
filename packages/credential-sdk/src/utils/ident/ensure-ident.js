import {
  DATETIME_MATCHER,
  PRIVATE_STATUS_LIST_ID_MATCHER,
  STATUS_LIST_ID_MATCHER,
  URI_MATCHER,
} from './matchers';
import { ensureString } from '../types/string';

/**
 * Ensures that the given string is a valid URI. If not, throws an error.
 *
 * @param {string} uri - The URI string to validate.
 */
export function ensureURI(uri) {
  if (URI_MATCHER.test(ensureString(uri))) {
    return uri;
  }

  throw new Error(`${uri} needs to be a valid URI.`);
}

/**
 * Ensures that the given string is a valid StatusList2021Credential identifier. Throws an error if not.
 *
 * @param {string} statusListId - The identifier string to validate.
 */
export function ensureStatusListId(statusListId) {
  if (STATUS_LIST_ID_MATCHER.test(ensureString(statusListId))) {
    return statusListId;
  }

  throw new Error(
    `\`${statusListId}\` needs to be a valid \`StatusList2021Credential\` identifier.`,
  );
}

/**
 * Ensures that the given string is a valid PrivateStatusList2021Credential identifier. Throws an error if not.
 *
 * @param {string} statusListId - The identifier string to validate.
 */
export function ensurePrivateStatusListId(statusListId) {
  if (PRIVATE_STATUS_LIST_ID_MATCHER.test(ensureString(statusListId))) {
    return statusListId;
  }

  throw new Error(
    `\`${statusListId}\` needs to be a valid \`PrivateStatusList2021Credential\` identifier.`,
  );
}

/**
 * Ensures that the given string is a valid datetime according to RFC3339 format. Throws an error if not.
 *
 * @param {string} datetime - The datetime string to validate.
 * @returns {string} - The original datetime string if it's valid.
 */
export function ensureValidDatetime(datetime) {
  if (DATETIME_MATCHER.test(ensureString(datetime))) {
    return datetime;
  }

  throw new TypeError(`${datetime} needs to be a valid datetime.`);
}
