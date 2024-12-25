import {
  DockDid,
  CheqdTestnetDid,
  Iri,
} from "@docknetwork/credential-sdk/types";
import { Base } from "./common.js";

export default class DIDMigration extends Base {
  static Prop = "attest";

  async existsOnCheqd([did, _]) {
    return (await this.module.getAttests(did)) != null;
  }

  async keys() {
    return await this.dock.api.query.attest.attestations.entries();
  }

  parse([did, attest]) {
    return [DockDid.from(did.toHuman()), Iri.from(attest.toHuman())];
  }

  async fetchEntry(entry) {
    return entry;
  }

  async *txs() {
    const { module } = this;

    for await (const [did, attest] of this.fetchAndFilter()) {
      const didKeypair = this.findKeypair(document);

      yield await module.setClaimTx(attest, did, didKeypair);
    }
  }
}
