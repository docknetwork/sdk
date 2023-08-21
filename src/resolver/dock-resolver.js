import DockDIDResolver from './did/dock-did-resolver';
import DockStatusListResolver from './status-list2021/dock-status-list2021-resolver';
import { MultiResolver } from './generic';

/**
 * Resolves dock-hosted entities such us `did:dock:*` and `status-list2021:dock:*`.
 */
export default class DockResolver extends MultiResolver {
  static PREFIX = [DockDIDResolver.PREFIX, DockStatusListResolver.PREFIX];
  static METHOD = 'dock';

  /**
   * Resolves dock-hosted entities such us `did:dock:*` and `status-list2021:dock:*`.
   * @param {DockAPI} dock - An initialized connection to a dock full-node.
   * @constructor
   */
  constructor(dock) {
    super([new DockDIDResolver(dock), new DockStatusListResolver(dock)]);
  }
}
