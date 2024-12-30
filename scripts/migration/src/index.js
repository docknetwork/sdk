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
import Migration from "./migration.js";
import { checkBalance } from "@cheqd/sdk";

const mnemonics = [
  "steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse",
];

const TEMPORARY_SEED = process.env.TEMPORARY_SEED_HEX || randomAsHex(32);

const keys = [];
keys.TEMPORARY = new Ed25519Keypair(TEMPORARY_SEED);
keys.push(keys.TEMPORARY);

console.log(`Temporary seed is ${TEMPORARY_SEED}`);
const DOCK_ENDPOINT = "wss://knox-1.dock.io";
const CHEQD_ENDPOINT = "http://localhost:26657";

const transferCheqd = async (cheqdAPI, from, to, amount) => {
  console.log(`Transfer ${fmtCheqdBalance(amount)} from ${from} to ${to}`);

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
      amount: [
        {
          denom: "ncheq", // cheqd's native token
          amount: String(amount), // Amount in base units (e.g., 1 CHEQ = 1,000,000 ncheq)
        },
      ],
    },
  };

  return await cheqdAPI.sdk.signer.signAndBroadcast(
    from,
    [msgSend],
    fee,
    "Migration"
  );
};

const initCheqd = async (walletsCount = 0) => {
  async function generateRandomWallet() {
    // Generate a random wallet
    const { mnemonic } = await DirectSecp256k1HdWallet.generate(24); // 24-word mnemonic for high security

    console.log("Generated:", mnemonic);

    return mnemonic;
  }

  const generated = await Promise.all(
    Array.from({ length: walletsCount }, generateRandomWallet)
  );

  const wallets = await Promise.all(
    [...mnemonics, ...generated].map((mnemonic) =>
      DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "cheqd",
      })
    )
  );
  const apis = await Promise.all(
    wallets.map((wallet) =>
      new CheqdAPI().init({
        url: CHEQD_ENDPOINT,
        network: CheqdNetwork.Testnet,
        wallet,
      })
    )
  );

  return { wallets, apis };
};

async function shareBalance({ apis, wallets }) {
  const [{ address: from }] = await wallets[0].getAccounts();
  const initBalance = await getBalanceCheqd(from);

  for (const wallet of wallets.slice(1)) {
    const [{ address: to }] = await wallet.getAccounts();

    await transferCheqd(apis[0], from, to, 1e20);
  }

  return initBalance;
}

async function payback({ apis, wallets }) {
  const [{ address: to }] = await wallets[0].getAccounts();

  for (let idx = 1; idx < wallets.length; idx++) {
    const wallet = wallets[idx];
    const [{ address: from }] = await wallet.getAccounts();
    const amount = await getBalanceCheqd(from);

    await transferCheqd(apis[idx], from, to, amount);
  }

  return await getBalanceCheqd(to);
}

const getBalanceCheqd = async (account) =>
  BigInt(
    (await checkBalance(account, CHEQD_ENDPOINT)).find(
      (balance) => balance.denom === "ncheq"
    ).amount
  );

const fmtCheqdBalance = (balance) => `${Number(balance) / 1e18} cheqd`;

async function main() {
  const dock = new DockAPI();

  await dock.init({ address: DOCK_ENDPOINT });
  const cheqds = await initCheqd(25);

  const initBalance = await shareBalance(cheqds);
  console.log(`Main account balance is ${fmtCheqdBalance(initBalance)}`);

  const modules = new MultiApiCoreModules([
    new DockCoreModules(dock),
    new CheqdCoreModules(cheqds.apis[0]),
  ]);
  const spawn = pLimit(10);

  const txs = new Migration(dock, modules, keys, spawn).txs();

  let globalTxIdx = 0;
  const loopCheqd = async (cheqd) => {
    let localTxIdx = 0;
    const [{ address }] = await cheqd.sdk.options.wallet.getAccounts();

    for await (const didTxs of txs) {
      for await (const tx of didTxs) {
        console.log(
          `Transaction #${++globalTxIdx} (#${++localTxIdx} from ${address}): ${maybeToJSONString(
            tx
          )}`
        );

        try {
          await cheqd.signAndSend(tx);
        } catch (err) {
          err.message = `Failed to execute transaction ${maybeToJSONString(
            tx
          )}: \n${err}`;
          console.error(err);
        }
      }
    }
  };

  await Promise.all(cheqds.apis.map(loopCheqd));

  const endBalance = await payback(cheqds);
  console.log(`Totally spent ${fmtCheqdBalance(initBalance - endBalance)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
