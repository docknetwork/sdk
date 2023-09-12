import { DockDIDResolver } from './did';
import { DockStatusList2021Resolver } from './status-list2021';
import { MultiResolver } from './generic';
import { DockRevRegResolver } from './rev-reg';
import { DockBlobResolver } from './blob';

/**
 * Resolves dock-hosted entities such us `did:dock:*` and `status-list2021:dock:*`, `rev-reg:dock:*`, `blob:dock:*`.
 */
export default class DockResolver extends MultiResolver {
  static PREFIX = [
    DockDIDResolver.PREFIX,
    DockStatusList2021Resolver.PREFIX,
    DockRevRegResolver.PREFIX,
    DockBlobResolver.PREFIX,
  ];

  static METHOD = 'dock';

  constructor(dock) {
    super([
      new DockDIDResolver(dock),
      new DockStatusList2021Resolver(dock),
      new DockRevRegResolver(dock),
      new DockBlobResolver(dock),
    ]);
  }
}
