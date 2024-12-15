import { CheqdDIDModule } from "@docknetwork/cheqd-blockchain-modules";
import { DockDIDModule } from "@docknetwork/dock-blockchain-modules";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules/multi-api";
import {
  DockDid,
  CheqdTestnetDid,
  CheqdTestnetDIDDocument,
} from "@docknetwork/credential-sdk/types";
import plimit from "p-limit";

export default class DIDMigration {
  constructor(dock, cheqd) {
    this.dock = dock;
    this.cheqd = cheqd;
    this.module = new MultiApiDIDModule([
      new DockDIDModule(dock),
      new CheqdDIDModule(cheqd),
    ]);
  }

  async *txs(concurrent = 10) {
    const { module, dock } = this;

    const dids = await dock.api.query.didModule.dids.keys();
    const parsedDids = dids.map((did) => DockDid.from(did.toHuman()[0]));

    console.log(`Total DIDs count: ${parsedDids.length}`);

    const limit = plimit(concurrent);

    const txs = parsedDids.map((did) =>
      limit(async () => {
        const document = await module.getDocument(did);
        const cheqdDid = CheqdTestnetDid.from(did);

        document.alsoKnownAs.push(did);
        const cheqdDoc = document.toCheqd(void 0, CheqdTestnetDIDDocument);

        console.log(`${did} => ${cheqdDid}`);
        console.log(cheqdDoc.toJSON());

        return await module.createDocumentTx(cheqdDoc);
      })
    );

    for (const tx of txs) {
      yield await tx;
    }
  }
}
