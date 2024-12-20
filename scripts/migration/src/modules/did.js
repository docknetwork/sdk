import {
  DockDid,
  CheqdTestnetDid,
  CheqdTestnetDIDDocument,
} from "@docknetwork/credential-sdk/types";
import { maybeToCheqdPayloadOrJSON } from "@docknetwork/credential-sdk/utils";
import { Base } from "./common.js";

export default class DIDMigration extends Base {
  static Prop = "did";

  async *txs() {
    const { module, dock } = this;

    const dids = await dock.api.query.didModule.dids.keys();
    const parsedDids = dids.map((did) => DockDid.from(did.toHuman()[0]));

    console.log(`Total DIDs count: ${parsedDids.length}`);

    const txs = parsedDids.map((did) =>
      this.spawn(async () => {
        const document = await module.getDocument(did);
        const cheqdDid = CheqdTestnetDid.from(did);

        document.alsoKnownAs.push(did);
        const cheqdDoc = document.toCheqd(void 0, CheqdTestnetDIDDocument);

        console.log(`${did} => ${cheqdDid}`);
        console.log(document.toJSON());
        console.log(maybeToCheqdPayloadOrJSON(cheqdDoc));

        return await module.createDocumentTx(cheqdDoc, []);
      })
    );

    for (const tx of txs) {
      yield await tx;
    }
  }
}
