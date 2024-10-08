import { DockDIDResolver } from './did';
import { DockStatusList2021Resolver } from './status-list2021';
import { MultiResolver } from './generic';
import { DockBlobResolver } from './blob';
import { ensureInstanceOf } from '../utils';
import { AbstractCoreModules } from '../modules';

/**
 * Resolves dock-hosted entities such us `did:dock:*` and `status-list2021:dock:*`, `rev-reg:dock:*`, `blob:dock:*`.
 */
export default class DockResolver extends MultiResolver {
  static PREFIX = [
    DockDIDResolver.PREFIX,
    DockStatusList2021Resolver.PREFIX,
    DockBlobResolver.PREFIX,
  ];

  static METHOD = 'dock';

  constructor(modules) {
    ensureInstanceOf(modules, AbstractCoreModules);

    super([
      new DockDIDResolver(modules.did),
      new DockStatusList2021Resolver(modules.statusListCredential),
      new DockBlobResolver(modules.blob),
    ]);
  }
}
