import { AccumulatorId } from "@docknetwork/credential-sdk/types";
import { Base } from "./common.js";
import { CheqdTestnetDid } from "@docknetwork/credential-sdk/types";

export class AccumulatorParamsMigration extends Base {
  static Prop = "accumulator";

  async existsOnCheqd() {
    return false;
    // return (await this.module.getParams(CheqdTestnetDid.from(did), id)) != null;
  }

  async keys() {
    return Object.keys(this.dids);
  }

  async fetchEntry(did) {
    return [did, await this.module.getAlParamsByDid(did)];
  }

  async *txs() {
    const { module } = this;

    for await (const [did, params] of this.fetchAndFilter()) {
      const keypair = this.findKeypair(await this.cheqdDocument(did));
      const keys = [...params].sort((a, b) => +a[0] - +b[0]);

      for (const [id, key] of keys) {
        yield await module.adParamsTx(
          id,
          key,
          CheqdTestnetDid.from(did),
          keypair
        );
      }
    }
  }
}

export class AccumulatorPublicKeysMigration extends Base {
  static Prop = "accumulator";

  async existsOnCheqd(_) {
    return false;
  }

  async keys() {
    return Object.keys(this.dids);
  }

  async fetchEntry(did) {
    return [did, await this.module.getAllPublicKeysByDid(did)];
  }

  keyDid(key) {
    return key[0];
  }

  async *txs() {
    const { module } = this;

    for await (const {
      keypair,
      item: [did, publicKeys],
    } of this.fetchAndFilterWithKeypair()) {
      const keys = [...publicKeys].sort((a, b) => +a[0] - +b[0]);

      for (const [id, key] of keys) {
        yield await module.addPublicKeyTx(
          id,
          key,
          CheqdTestnetDid.from(did),
          keypair
        );
      }
    }
  }
}

export class AccumulatorMigration extends Base {
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

    for await (const {
      item: [id, accumulator],
      keypair,
    } of this.fetchAndFilterWithKeypair()) {
      if (!accumulator.keyRef) {
        console.log(`Skipping accumulator ${id}`);
        continue;
      }
      const {
        keyRef: [did],
      } = accumulator;

      yield await module.modules[1].tx.addAccumulator(
        [CheqdTestnetDid.from(did), id],
        accumulator,
        keypair
      );
    }
  }
}
