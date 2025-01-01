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
import { checkBalance } from "@cheqd/sdk";
import { DirectSecp256k1HdWallet } from "@docknetwork/cheqd-blockchain-api/wallet";
import Migration from "./migration.js";

const TEMPORARY_SEED = process.env.TEMPORARY_SEED_HEX || randomAsHex(32);
const DOCK_ENDPOINT = process.env.DOCK_ENDPOINT || "wss://mainnet-node.dock.io";
const CHEQD_ENDPOINT = process.env.CHEQD_ENDPOINT || "http://localhost:26657";
const ACCOUNT_COUNT = process.env.CHEQD_ACCOUNTS || 1;
const MNEMONIC = process.env.CHEQD_MNEMONIC;

const keys = [];
keys.TEMPORARY = new Ed25519Keypair(TEMPORARY_SEED);
keys.push(keys.TEMPORARY);

console.log(`Temporary seed is ${TEMPORARY_SEED}`);

const transferCheqd = (from, to, amount) => {
  console.log(`Transfer ${fmtCheqdBalance(amount)} from ${from} to ${to}`);

  return {
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
};

const initCheqd = async (walletsCount = 0) => {
  async function generateRandomWallet() {
    // Generate a random wallet
    const wallet = await DirectSecp256k1HdWallet.generate(24); // 24-word mnemonic for high security
    const [{ address }] = await wallet.getAccounts();

    console.log(address, ":", wallet.mnemonic);

    return wallet.mnemonic;
  }

  const generated = await Promise.all(
    Array.from({ length: walletsCount }, generateRandomWallet)
  );

  const wallets = await Promise.all(
    [MNEMONIC, ...generated].map((mnemonic) =>
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
  const txs = [];

  for (const wallet of wallets.slice(1)) {
    const [{ address: to }] = await wallet.getAccounts();

    txs.push(transferCheqd(from, to, 1e18));
  }

  const fee = {
    amount: [
      { denom: "ncheq", amount: String(10000000 * (wallets.length - 1)) },
    ], // Fee amount in ncheq
    gas: String(200000 * (wallets.length - 1)), // Gas limit
    payer: from,
  };

  if (txs.length) {
    await apis[0].sdk.signer.signAndBroadcast(
      from,
      txs,
      fee,
      "Migration balance share"
    );
  }

  return initBalance;
}

async function payback({ apis, wallets }) {
  const [{ address: to }] = await wallets[0].getAccounts();

  await Promise.all(
    wallets.slice(1).map(async (wallet, idx) => {
      const [{ address: from }] = await wallet.getAccounts();
      const amount = await getBalanceCheqd(from);

      const transfer = transferCheqd(from, to, amount);

      const fee = {
        amount: [{ denom: "ncheq", amount: "10000000" }], // Fee amount in ncheq
        gas: "200000", // Gas limit
        payer: from,
      };

      await apis[idx + 1].sdk.signer.signAndBroadcast(
        from,
        [transfer],
        fee,
        "Migration balance payback"
      );
    })
  );

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
  const cheqds = await initCheqd(+ACCOUNT_COUNT);

  const initBalance = await shareBalance(cheqds);
  console.log(
    `Initial main account balance was ${fmtCheqdBalance(initBalance)}`
  );

  const modules = new MultiApiCoreModules([
    new DockCoreModules(dock),
    new CheqdCoreModules(cheqds.apis[0]),
  ]);
  const spawn = pLimit(10);

  const txs = new Migration(dock, cheqds.apis[0], modules, keys, spawn).txs();

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

  let err;
  try {
    await Promise.all(cheqds.apis.map(loopCheqd));
  } catch (error) {
    err = error;
  } finally {
    const endBalance = await payback(cheqds);
    console.log(
      `Final main account balance is ${fmtCheqdBalance(
        endBalance
      )}. Totally spent ${fmtCheqdBalance(initBalance - endBalance)}.`
    );
  }

  if (err != null) {
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
