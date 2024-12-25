import {
  DockDid,
  CheqdTestnetDIDDocument,
} from "@docknetwork/credential-sdk/types";
import { NoDIDError } from "@docknetwork/credential-sdk/modules/abstract/did";
import { Base } from "./common.js";

export default class DIDMigration extends Base {
  static Prop = "did";

  async existsOnCheqd(did) {
    try {
      await this.module.getDocument(did);

      return true;
    } catch (err) {
      if (err instanceof NoDIDError) {
        return false;
      }

      throw err;
    }
  }

  async keys() {
    return await this.dock.api.query.didModule.dids.keys();
  }

  parse(did) {
    return DockDid.from(did.toHuman()[0]);
  }

  async fetchEntry(did) {
    return await module.getDocument(did);
  }

  async *txs() {
    const { module } = this;

    for await (const document of this.fetchAndFilter()) {
      const { id: did } = document;
      document.alsoKnownAs.push(did);
      const keypair = this.findKeypairOrAddTemporary(document);
      const cheqdDoc = document
        .setAttests(null)
        .toCheqd(void 0, CheqdTestnetDIDDocument);

      yield await module.createDocumentTx(cheqdDoc, keypair);
    }
  }
}
