import { CheqdDIDModule } from "@docknetwork/cheqd-blockchain-modules";
import { DockDIDModule } from "@docknetwork/dock-blockchain-modules";
import { MultiApiDIDModule } from "@docknetwork/credential-sdk/modules/multi-api";
import {
  DockDid,
  CheqdTestnetDid,
  CheqdTestnetDIDDocument,
} from "@docknetwork/credential-sdk/types";

export default class DIDMigration {
  constructor(dock, cheqd) {
    this.dock = dock;
    this.cheqd = cheqd;
    this.module = new MultiApiDIDModule([
      new DockDIDModule(dock),
      new CheqdDIDModule(cheqd),
    ]);
  }

  async run() {
    const { module, dock } = this;

    const dids = await dock.api.query.didModule.dids.keys();
    const parsedDids = dids.map((did) => DockDid.from(did.toHuman()[0]));

    console.log(`Total DIDs count: ${parsedDids.length}`);

    for (const did of parsedDids) {
      const document = await module.getDocument(did);
      console.log(String(CheqdTestnetDid.from));
      const cheqdDid = CheqdTestnetDid.from(did);

      console.log(`${did} => ${cheqdDid}`);
      document.alsoKnownAs.push(did);
      console.log(document.toCheqd(void 0, CheqdTestnetDIDDocument).toJSON());
    }
  }
}
