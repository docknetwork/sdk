import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { Ed25519Keypair } from "@docknetwork/credential-sdk/keypairs";
import { CheqdAPI, CheqdNetwork } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import {
  randomAsHex,
  maybeToCheqdPayloadOrJSON,
} from "@docknetwork/credential-sdk/utils";
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
import pLimit from "p-limit";
import { DirectSecp256k1HdWallet } from "@docknetwork/cheqd-blockchain-api/wallet";
import DIDMigration from "./modules/did.js";
import AttestMigration from "./modules/attest.js";
import AccumulatorMigration from "./modules/accumulator.js";

const mnemonics = [
  "steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse",
];

const TEMPORARY_SEED = process.env.TEMPORARY_SEED_HEX || randomAsHex(32);

const keys = [];
keys.TEMPORARY = new Ed25519Keypair(TEMPORARY_SEED);
keys.push(keys.TEMPORARY);

console.log(`Temporary seed is ${TEMPORARY_SEED}`);
const DOCK_ENDPOINT = "wss://mainnet-node.dock.io";

async function main() {
  const dock = new DockAPI();

  await dock.init({ address: DOCK_ENDPOINT });
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
  const limit = pLimit(10);
  const didMigration = new DIDMigration(dock, modules, keys, limit);
  const attestMigration = new AttestMigration(dock, modules, keys, limit);
  const accumulatorMigration = new AccumulatorMigration(
    dock,
    modules,
    keys,
    limit
  );

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
          console.error("ERROR", err);
        } finally {
          cheqd.busy = false;
        }

        return cheqd;
      })();
    }
  };

  let idx = 0;
  for await (const tx of accumulatorMigration.txs()) {
    console.log(`Transaction #${++idx}: ${maybeToCheqdPayloadOrJSON(tx)}`);
    await withCheqd((cheqd) => cheqd.signAndSend(tx));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
