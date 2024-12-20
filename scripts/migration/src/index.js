import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { CheqdAPI, CheqdNetwork } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
import pLimit from "p-limit";
import { DirectSecp256k1HdWallet } from "@docknetwork/cheqd-blockchain-api/wallet";
import DIDMigration from "./modules/did.js";

const mnemonics = [
  "steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse",
];

async function main() {
  const dock = new DockAPI();

  await dock.init({ address: "wss://mainnet-node.dock.io" });
  const sharedCheqds = mnemonics.map(async (mnemonic) =>
    new CheqdAPI().init({
      url: "http://localhost:26657",
      network: CheqdNetwork.Testnet,
      wallet: await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "cheqd",
      }),
    })
  );

  const modules = new MultiApiCoreModules([
    new DockCoreModules(dock),
    new CheqdCoreModules(await sharedCheqds[0]),
  ]);
  const didMigration = new DIDMigration(dock, modules, pLimit(10));

  const withCheqd = async (fn) => {
    const cheqd = await Promise.race(sharedCheqds);
    if (cheqd.busy) {
      return new Promise((resolve) =>
        setImmediate(() => resolve(withCheqd(fn)))
      );
    } else {
      const idx = sharedCheqds.indexOf(cheqd);
      cheqd.busy = true;

      sharedCheqds[idx] = (async () => {
        try {
          await fn(cheqd);
        } catch (err) {
          err.message = `Failed to execute transaction:\n${err}`;
          console.error(err);
        } finally {
          cheqd.busy = false;
        }

        return cheqd;
      })();
    }
  };

  for await (const tx of didMigration.txs()) {
    await withCheqd((cheqd) => cheqd.signAndSend(tx));
  }
}

main().catch(console.error);
