import { DIDResolver } from './did';
import { StatusList2021Resolver } from './status-list2021';
import { ResolverRouter } from './generic';
import { BlobResolver } from './blob';
import { ensureInstanceOf } from '../utils';
import { AbstractCoreModules } from '../modules';

/**
 * Resolves dock-hosted entities such us `did:dock:*` and `status-list2021:dock:*`, `rev-reg:dock:*`, `blob:dock:*`.
 */
export default class CoreResolver extends ResolverRouter {
  constructor(modules) {
    ensureInstanceOf(modules, AbstractCoreModules);

    super([
      new DIDResolver(modules.did),
      new StatusList2021Resolver(modules.statusListCredential),
      new BlobResolver(modules.blob),
    ]);
  }
}
