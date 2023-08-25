import { MultiResolver, METHOD_REG_EXP_PATTERN, HEX_ID_REG_EXP_PATTERN } from '../generic';

const REV_REG_ID_MATCHER = new RegExp(
  `^rev-reg:${METHOD_REG_EXP_PATTERN}:${HEX_ID_REG_EXP_PATTERN}#${HEX_ID_REG_EXP_PATTERN}$`,
);

/**
 * Resolves revocation status with identifier `rev-reg:*`.
 */
export default class RevRegResolver extends MultiResolver {
  static PREFIX = 'rev-reg';

  /**
   * @param {string} revRegId
   */
  parse(revRegId) {
    if (revRegId === '' || !revRegId) throw new Error('Missing `revRegId`');
    const match = revRegId.match(REV_REG_ID_MATCHER);

    if (match == null) {
      throw new Error(`Invalid revocation registry entry id: ${revRegId}`);
    }
    const [_, method, regId, revId] = match;

    return { method, regId, revId };
  }
}
