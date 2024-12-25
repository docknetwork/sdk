import { AccumulatorId } from "@docknetwork/credential-sdk/types";
import { Base } from "./common.js";
import { dockIdentToCheqd } from "@docknetwork/credential-sdk/utils/misc";
import {
  CheqdAccumulatorId,
  CheqdTestnetDid,
} from "@docknetwork/credential-sdk/types";
import { TypedUUID } from "@docknetwork/credential-sdk/types/generic";

export class AccumulatorPublicKeysMigration extends Base {
  static Prop = "accumulator";

  async existsOnCheqd([did, id]) {
    return (await this.module.getPublicKey(did, id)) != null;
  }

  async keys() {
    return Object.keys(this.dids);
  }

  async fetchEntry(did) {
    return [did, await this.module.getAllPublicKeysByDid(did)];
  }

  async *txs() {
    const { module } = this;

    for await (const [did, publicKeys] of this.fetchAndFilter()) {
      const keypair = this.findKeypair(await this.cheqdDocument(did));
      const keys = [...publicKeys].sort((a, b) => +a[0] - +b[0]);

      for (const [id, key] of keys) {
        yield await module.addPublicKeyTx(
          TypedUUID.fromDockIdent(id),
          key,
          did,
          keypair
        );
      }
    }
  }
}

export default class AccumulatorMigration extends Base {
  static Prop = "accumulator";

  async existsOnCheqd([did, _]) {
    return (await this.module.getAccumulator(did)) != null;
  }

  async keys() {
    return await this.dock.api.query.accumulator.accumulators.keys();
  }

  parse(id) {
    return AccumulatorId.from(id);
  }

  async fetchEntry(key) {
    return [key, await this.module.getAccumulator(key, true, true)];
  }

  async *txs() {
    const { module } = this;

    for await (const [id, accumulator] of this.fetchAndFilter()) {
      const didKeypair = this.findKeypair(document);

      if (!accumulator.keyRef) {
        console.log(`Skipping accumulator ${id}`);
        continue;
      }
      const {
        keyRef: [did],
      } = accumulator;

      yield await module.modules[1].tx.addAccumulator(
        [CheqdTestnetDid.from(did), TypedUUID.fromDockIdent(id)],
        accumulator,
        didKeypair
      );

      if (accumulator.publicKey != null) {
        yield await module.addPublicKeyTx(
          TypedUUID.random(),
          accumulator.publicKey,
          targetDid,
          didKeypair
        );
      }
    }
  }
}
