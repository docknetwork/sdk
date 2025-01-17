import { DockAPI } from '@docknetwork/dock-blockchain-api';
import { Ed25519Keypair } from '@docknetwork/credential-sdk/keypairs';
import { CheqdAPI, CheqdNetwork } from '@docknetwork/cheqd-blockchain-api';
import {
  maybeToJSONString,
  timeout,
  maybeToCheqdPayloadOrJSON,
} from '@docknetwork/credential-sdk/utils';

import pLimit from 'p-limit';
import { checkBalance } from '@cheqd/sdk';
import { DirectSecp256k1HdWallet } from '@docknetwork/cheqd-blockchain-api/wallet';
import Migration from './migration.js';

const DOCK_ENDPOINT = process.env.DOCK_ENDPOINT || 'wss://mainnet-node.dock.io';
const CHEQD_ENDPOINT = process.env.CHEQD_ENDPOINT || 'http://localhost:26657';
const CHEQD_NETWORK = process.env.CHEQD_NETWORK || CheqdNetwork.Testnet;
const ACCOUNT_COUNT = process.env.CHEQD_ACCOUNTS || 1;
const BALANCE_SHARE = Number(process.env.BALANCE_SHARE || 4e3);
const MNEMONIC = process.env.CHEQD_MNEMONIC;
const TRANSFER_FEE = Number(process.env.TRANSFER_FEE || 10000000);

const { MASTER_KEY } = process.env;
if (!MASTER_KEY) {
  throw new Error('No master key');
}

const keyPairs = (process.env.SEEDS || '')
  .split(',')
  .filter(Boolean)
  .map((seed) => new Ed25519Keypair(seed))
  .reduce(
    (acc, cur) => ({ ...acc, [cur.publicKey()]: cur }),
    Object.create(null),
  );

keyPairs.MASTER_KEY = MASTER_KEY;

const loopWithCatch = async (fn, catchFn) => {
  const continueSym = Symbol('continue');

  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (catchFn(err, continueSym) !== continueSym) break;
    }
  }
};

const loopStreamWithCatch = async (stream, fn, catchFn) => {
  for await (const item of stream) {
    await loopWithCatch(
      () => fn(item),
      (err, sym) => catchFn(err, item, sym),
    );
  }
};

const transferNCHEQ = (from, to, ncheq) => {
  console.log(`Transfer ${fmtNCHEQBalance(ncheq)} from ${from} to ${to}`);

  return {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: from,
      toAddress: to,
      amount: [
        {
          denom: 'ncheq', // cheqd's native token
          amount: String(ncheq), // Amount in base units (e.g., 1 CHEQ = 1,000,000 ncheq)
        },
      ],
    },
  };
};

const initCheqd = async (walletsCount = 0) => {
  async function generateRandomWallet(_, idx) {
    // Generate a random wallet
    const wallet = await DirectSecp256k1HdWallet.generate(24, {
      prefix: 'cheqd',
    }); // 24-word mnemonic for high security
    const [{ address }] = await wallet.getAccounts();

    console.log(address, ':', wallet.mnemonic);

    return wallet.mnemonic;
  }

  const generated = await Promise.all(
    Array.from({ length: walletsCount }, generateRandomWallet),
  );

  const wallets = await Promise.all(
    [MNEMONIC, ...generated].map((mnemonic) => DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: 'cheqd',
    })),
  );

  return await Promise.all(
    wallets.map(async (wallet) => ({
      api: await new CheqdAPI().init({
        url: CHEQD_ENDPOINT,
        network: CHEQD_NETWORK,
        wallet,
      }),
      wallet,
    })),
  );
};

async function shareBalance(cheqds, spawn) {
  const [{ address: from }] = await cheqds[0].wallet.getAccounts();
  let initBalance = BigInt(BALANCE_SHARE * 1e9) * BigInt(Math.max(cheqds.length - 1, 0));

  const txs = [
    ...(await Promise.all(
      cheqds.slice(1).map(({ wallet }) => spawn(async () => {
        const [{ address: to }] = await wallet.getAccounts();
        try {
          initBalance += await getBalanceCheqd(to);
        } catch {}

        if (BALANCE_SHARE > 0) {
          return transferNCHEQ(from, to, BALANCE_SHARE * 1e9);
        } else {
          return null;
        }
      })),
    )),
  ].filter(Boolean);

  const fee = {
    amount: [
      { denom: 'ncheq', amount: String(TRANSFER_FEE * (cheqds.length - 1)) },
    ], // Fee amount in ncheq
    gas: String(200000 * (cheqds.length - 1)), // Gas limit
    payer: from,
  };

  if (txs.length) {
    await cheqds[0].api.sdk.signer.signAndBroadcast(
      from,
      txs,
      fee,
      'Migration balance share',
    );
  }

  return initBalance;
}

async function payback(cheqds) {
  const [{ address: to }] = await cheqds[0].wallet.getAccounts();
  let total = BigInt(0);

  await Promise.all(
    cheqds.slice(1).map(async ({ wallet, api }) => {
      const [{ address: from }] = await wallet.getAccounts();
      const balance = await getBalanceCheqd(from);
      total += balance;

      if (balance <= BigInt(TRANSFER_FEE)) {
        return;
      }

      const transfer = transferNCHEQ(from, to, balance - BigInt(TRANSFER_FEE));

      const fee = {
        amount: [{ denom: 'ncheq', amount: String(TRANSFER_FEE) }], // Fee amount in ncheq
        gas: '200000', // Gas limit
        payer: from,
      };

      await api.sdk.signer.signAndBroadcast(
        from,
        [transfer],
        fee,
        'Migration balance payback',
      );
    }),
  );

  return total;
}

const getBalanceCheqd = async (account) => {
  const entries = await checkBalance(account, CHEQD_ENDPOINT);
  const cheqd = entries.find((balance) => balance.denom === 'ncheq')?.amount;

  return cheqd ? BigInt(cheqd) : BigInt(0);
};

const fmtNCHEQBalance = (ncheq) => `${(Number(ncheq) / 1e9).toFixed(9)} CHEQD`;

async function main() {
  const start = +new Date();
  const dock = new DockAPI();
  const spawn = pLimit(10);

  await dock.init({ address: DOCK_ENDPOINT });
  dock.params = { address: DOCK_ENDPOINT };

  const cheqds = await initCheqd(+ACCOUNT_COUNT);

  const initBalance = await shareBalance(cheqds, spawn);
  console.log(`Initial migration balance was ${fmtNCHEQBalance(initBalance)}`);

  let globalTxIdx = 0;
  let totalDLRs = 0;
  let totalDIDs = 0;
  let err;
  try {
    const txs = new Migration(dock, cheqds[0].api, keyPairs, spawn).txs();

    const loopSender = async ({ api, wallet }) => {
      let localTxIdx = 0;
      const [{ address }] = await api.sdk.options.wallet.getAccounts();

      const reconnect = async () => {
        console.log(`Reconnecting ${address}`);

        await loopWithCatch(
          async () => {
            try {
              await api.disconnect();
            } finally {
              await api.init({
                url: CHEQD_ENDPOINT,
                network: CHEQD_NETWORK,
                wallet,
              });
            }
          },
          (err, continueSym) => {
            console.error(err);

            return continueSym;
          },
        );
      };
      const sendTx = async (tx) => {
        console.log(
          `Transaction #${
            localTxIdx + 1
          } sent from ${address}: ${maybeToJSONString(tx)}`,
        );

        const res = await api.signAndSend(tx);

        ++globalTxIdx;
        ++localTxIdx;
        if (String(tx.typeUrl) === 'MsgCreateResource') {
          totalDLRs++;
        } else if (String(tx.typeUrl) === 'MsgCreateDidDoc') {
          totalDIDs++;
        }

        console.log(
          `Transaction #${localTxIdx} from ${address} was processed (#${globalTxIdx})`,
        );

        return res;
      };
      const handleTxError = async (err, tx, continueSym) => {
        err.message = `Failed to execute transaction ${JSON.stringify(
          maybeToCheqdPayloadOrJSON(tx),
        )}: ${err.message}`;
        const strErr = String(err);

        if (
          strErr.includes('account sequence mismatch')
          || strErr.includes('incorrect account sequence')
          || strErr.includes('is not initialized')
        ) {
        } else if (
          strErr.includes('fetch failed')
          || strErr.includes('Bad status')
          || strErr.includes('other side closed')
        ) {
          await reconnect();
        } else if (
          strErr.includes('DID Doc exists')
          || strErr.includes('Resource exists')
          || strErr.includes('tx already exists in cache')
          || strErr.includes('was submitted but was not yet found on the chain')
          || strErr.includes('provided')
        ) {
          console.error(err);
          console.log(`Skipping transaction #${localTxIdx} from ${address}`);

          return;
        } else {
          throw err;
        }

        console.error(err);
        return continueSym;
      };

      const handleDidTxs = (didTxs) => loopStreamWithCatch(didTxs(), sendTx, handleTxError);
      const handleDidTxsError = async (err, continueSym) => {
        err.message = `Failed to send transaction from ${
          (await wallet.getAccounts())[0].address
        }: \n${err.message}`;
        const strErr = String(err);

        if (
          strErr.includes('No keypair')
          || strErr.includes('Dock DID not found for')
          || strErr.includes('the DID in question does not exist')
        ) {
          console.error(err);
        } else if (strErr.includes('fetch failed')) {
          await reconnect();
        } else {
          throw err;
        }

        return continueSym;
      };

      await loopStreamWithCatch(txs, handleDidTxs, handleDidTxsError);
    };

    await Promise.all(cheqds.slice(1).map(loopSender));
  } catch (error) {
    err = error;
  } finally {
    try {
      await timeout(3e3);
      const endBalance = await payback(cheqds);

      console.log(
        `Total spent: ${fmtNCHEQBalance(initBalance - endBalance)}
Total time taken: ${new Date() - start} seconds
Total transactions sent: ${globalTxIdx}, average per sender: ${
  globalTxIdx / +ACCOUNT_COUNT
}
Created ${totalDIDs} DIDs and ${totalDLRs} DLRs`,
      );
    } catch (error) {
      error.message = `Payback failed: ${error.message}`;
      console.error(error);

      err ||= error;
    }
  }

  if (err != null) {
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
