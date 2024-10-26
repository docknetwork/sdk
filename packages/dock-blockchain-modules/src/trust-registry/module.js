import { AbstractTrustRegistryModule } from '@docknetwork/credential-sdk/modules/abstract/trust-registry';
import {
  TrustRegistryInfo,
  DockTrustRegistryId,
  TrustRegistries,
  TrustRegistry,
  DockDidOrDidMethodKey,
} from '@docknetwork/credential-sdk/types';
import { option } from '@docknetwork/credential-sdk/types/generic';
import { injectDock } from '../common';
import DockInternalTrustRegistryModule from './internal';

export default class DockTrustRegistryModule extends injectDock(
  AbstractTrustRegistryModule,
) {
  static DockOnly = DockInternalTrustRegistryModule;

  async getRegistry(regId) {
    const id = DockTrustRegistryId.from(regId);

    const [infoOpt, metadata] = await Promise.all([
      this.dockOnly.query.trustRegistriesInfo(id),
      this.dockOnly.rpc.allRegistrySchemaMetadata(id),
    ]);

    const info = option(TrustRegistryInfo).from(infoOpt);
    if (info == null) {
      return null;
    }

    return new TrustRegistry(info, metadata);
  }

  async getAllRegistriesByDid(did) {
    const hexDid = DockDidOrDidMethodKey.from(did);
    const ids = await this.dockOnly.query.convenerTrustRegistries(hexDid);

    return new TrustRegistries(
      await Promise.all(
        [...ids].map(async (id) => [id, await this.getRegistry(id)]),
      ),
    );
  }

  async createRegistryTx(id, info, schemas, didKeypair) {
    return await this.dockOnly.apiProvider.batchAll(
      await Promise.all(
        await this.dockOnly.apiProvider.withDidNonce(
          didKeypair.did,
          (nonce) => [
            this.dockOnly.initOrUpdateTx(
              info.convener,
              id,
              info.name,
              info.govFramework,
              didKeypair,
              nonce.inc(),
            ),
            this.dockOnly.setSchemasMetadataTx(
              didKeypair.did,
              id,
              { Set: schemas },
              didKeypair,
              nonce.inc(),
            ),
          ],
        ),
      ),
    );
  }

  async updateRegistryTx(id, info, schemas, didKeypair) {
    return await this.createRegistryTx(id, info, schemas, didKeypair);
  }
}
