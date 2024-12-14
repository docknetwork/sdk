import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { CheqdAPI } from "@docknetwork/cheqd-blockchain-api";
import DIDMigration from "./did.js";

async function main() {
  const dock = new DockAPI();
  const cheqd = new CheqdAPI();

  await dock.init({ address: "wss://mainnet-node.dock.io" });
  const didMigration = new DIDMigration(dock, cheqd);

  await didMigration.run();
}

main().catch(console.error);
