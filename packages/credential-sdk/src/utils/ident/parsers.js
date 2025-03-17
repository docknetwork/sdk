import { DID_MATCHER } from './matchers';
import { ensureString } from '../types/string';

/**
 * Parses supplied DID URL.
 * @param {string} didUrl
 * @returns {object}
 */
export function parseDIDUrl(didUrl) {
  const sections = ensureString(didUrl).match(DID_MATCHER);

  if (sections == null) {
    throw new Error(`Invalid DID: \`${didUrl}\``);
  }

  const parts = {
    did: `did:${sections[1]}:${sections[2]}`,
    method: sections[1],
    id: sections[2],
    didUrl,
  };
  if (sections[4]) {
    const params = sections[4].slice(1).split(';');
    parts.params = {};
    for (const p of params) {
      const kv = p.split('=');

      // eslint-disable-next-line prefer-destructuring
      parts.params[kv[0]] = kv[1];
    }
  }
  // eslint-disable-next-line prefer-destructuring
  if (sections[6]) parts.path = sections[6];
  if (sections[7]) parts.query = sections[7].slice(1);
  if (sections[8]) parts.fragment = sections[8].slice(1);
  return parts;
}
