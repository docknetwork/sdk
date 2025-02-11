import { DIDResolverWithDIDReplacement } from './did';
import { StatusList2021Resolver } from './status-list2021';
import { BlobResolver } from './blob';
import { ResolverRouter } from './generic';
import { ensureInstanceOf } from '../utils';
import { AbstractCoreModules } from '../modules';

/**
 * Resolves dock-hosted entities such us `did:dock:*` and `status-list2021:dock:*`, `rev-reg:dock:*`, `blob:dock:*`.
 */
export default class CoreResolver extends ResolverRouter {
  constructor(modules) {
    const { did, statusListCredential, blob } = ensureInstanceOf(
      modules,
      AbstractCoreModules,
    );

    super([
      new DIDResolverWithDIDReplacement(did),
      new StatusList2021Resolver(statusListCredential),
      new BlobResolver(blob),
    ]);
  }
}
