import { DockAPI } from "@docknetwork/dock-blockchain-api";
import { Ed25519Keypair } from "@docknetwork/credential-sdk/keypairs";
import { CheqdAPI, CheqdNetwork } from "@docknetwork/cheqd-blockchain-api";
import { MultiApiCoreModules } from "@docknetwork/credential-sdk/modules";
import {
  randomAsHex,
  maybeToJSONString,
} from "@docknetwork/credential-sdk/utils";
import { DockCoreModules } from "@docknetwork/dock-blockchain-modules";
import { CheqdCoreModules } from "@docknetwork/cheqd-blockchain-modules";
import pLimit from "p-limit";
import { DirectSecp256k1HdWallet } from "@docknetwork/cheqd-blockchain-api/wallet";
import DIDMigration from "./modules/did.js";

const mnemonics = [
  "steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse",
];

const TEMPORARY_SEED = process.env.TEMPORARY_SEED_HEX || randomAsHex(32);

const keys = [];
keys.TEMPORARY = new Ed25519Keypair(TEMPORARY_SEED);
keys.push(keys.TEMPORARY);

console.log(`Temporary seed is ${TEMPORARY_SEED}`);
const DOCK_ENDPOINT = "wss://mainnet-node.dock.io";

async function generateRandomWallet() {
  // Generate a random wallet
  const { mnemonic } = await DirectSecp256k1HdWallet.generate(24); // 24-word mnemonic for high security

  console.log("Generated:", mnemonic);

  return mnemonic;
}

const transfer = async (cheqdAPI, from, to) => {
  console.log(`Transfer from ${from} to ${to}`);
  const amount = [
    {
      denom: "ncheq", // cheqd's native token
      amount: "100000000000000", // Amount in base units (e.g., 1 CHEQ = 1,000,000 ncheq)
    },
  ];

  const fee = {
    amount: [{ denom: "ncheq", amount: "10000000" }], // Fee amount in ncheq
    gas: "200000", // Gas limit
    payer: from,
  };

  const msgSend = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress: from,
      toAddress: to,
      amount,
    },
  };

  return await cheqdAPI.sdk.signer.signAndBroadcast(
    from,
    [msgSend],
    fee,
    "Migration"
  );
};

async function main() {
  const dock = new DockAPI();

  await dock.init({ address: DOCK_ENDPOINT });

  const generated = await Promise.all(
    Array.from({ length: 1 }, generateRandomWallet)
  );
  const wallets = await Promise.all(
    [...mnemonics, ...generated].map((mnemonic) =>
      DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "cheqd",
      })
    )
  );
  console.log(await wallets[0].getAccounts());
  const defaultCheqd = await new CheqdAPI().init({
    url: "http://localhost:26657",
    network: CheqdNetwork.Testnet,
    wallet: wallets[0],
  });

  for (const wallet of wallets.slice(1)) {
    await transfer(
      defaultCheqd,
      (
        await wallets[0].getAccounts()
      )[0].address,
      (
        await wallet.getAccounts()
      )[0].address
    );
  }

  const modules = new MultiApiCoreModules([
    new DockCoreModules(dock),
    new CheqdCoreModules(defaultCheqd),
  ]);
  const limit = pLimit(10);
  const didMigration = new DIDMigration(dock, modules, keys, limit);

  const txs = didMigration.txs();

  let idx = 0;
  return await Promise.all(
    wallets.map(async (wallet) => {
      const cheqd = await new CheqdAPI().init({
        url: "http://localhost:26657",
        network: CheqdNetwork.Testnet,
        wallet,
      });

      for await (const didTxs of txs) {
        for await (const tx of didTxs) {
          console.log(`Transaction #${++idx}: ${maybeToJSONString(tx)}`);

          try {
            await cheqd.signAndSend(tx);
          } catch (err) {
            err.message = `Failed to execute transaction:\n${err}`;
            console.error(err);
          }
        }
      }
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
