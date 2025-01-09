import { DockAPI } from '@docknetwork/dock-blockchain-api';
import { Ed25519Keypair } from '@docknetwork/credential-sdk/keypairs';
import { CheqdAPI, CheqdNetwork } from '@docknetwork/cheqd-blockchain-api';
import { maybeToJSONString, timeout } from '@docknetwork/credential-sdk/utils';

import pLimit from 'p-limit';
import { checkBalance } from '@cheqd/sdk';
import { DirectSecp256k1HdWallet } from '@docknetwork/cheqd-blockchain-api/wallet';
import Migration from './migration.js';

const DOCK_ENDPOINT = process.env.DOCK_ENDPOINT || 'wss://mainnet-node.dock.io';
const CHEQD_ENDPOINT = process.env.CHEQD_ENDPOINT || 'http://localhost:26657';
const ACCOUNT_COUNT = process.env.CHEQD_ACCOUNTS || 1;
const BALANCE_SHARE = Number(process.env.BALANCE_SHARE || 1e6);
const MNEMONIC = process.env.CHEQD_MNEMONIC;
const TRANSFER_FEE = Number(process.env.TRANSFER_FEE || 10000000);

const keyPairs = (process.env.SEEDS || '')
  .split(',')
  .filter(Boolean)
  .map((seed) => new Ed25519Keypair(seed))
  .reduce(
    (acc, cur) => ({ ...acc, [cur.publicKey()]: cur }),
    Object.create(null),
  );

const BREAK = Symbol('BREAK');

const loopWithCatch = async (fn, catchFn) => {
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (catchFn(err) === BREAK) break;
    }
  }
};

const loopStreamWithCatch = async (stream, fn, catchFn) => {
  for await (const item of stream) {
    await loopWithCatch(
      () => fn(item),
      (err) => catchFn(err, item),
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
  async function generateRandomWallet() {
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
  const apis = await Promise.all(
    wallets.map((wallet) => new CheqdAPI().init({
      url: CHEQD_ENDPOINT,
      network: CheqdNetwork.Testnet,
      wallet,
    })),
  );

  return { wallets, apis };
};

async function shareBalance({ apis, wallets }) {
  const [{ address: from }] = await wallets[0].getAccounts();
  const initBalance = await getBalanceCheqd(from);
  const txs = [];

  for (const wallet of wallets.slice(1)) {
    const [{ address: to }] = await wallet.getAccounts();

    txs.push(transferNCHEQ(from, to, BALANCE_SHARE * 1e9));
  }

  const fee = {
    amount: [
      { denom: 'ncheq', amount: String(TRANSFER_FEE * (wallets.length - 1)) },
    ], // Fee amount in ncheq
    gas: String(200000 * (wallets.length - 1)), // Gas limit
    payer: from,
  };

  if (txs.length) {
    await apis[0].sdk.signer.signAndBroadcast(
      from,
      txs,
      fee,
      'Migration balance share',
    );
  }

  return initBalance;
}

async function payback({ apis, wallets }) {
  const [{ address: to }] = await wallets[0].getAccounts();

  await Promise.all(
    wallets.slice(1).map(async (wallet, idx) => {
      const [{ address: from }] = await wallet.getAccounts();
      const balance = await getBalanceCheqd(from);

      const transfer = transferNCHEQ(from, to, balance - BigInt(TRANSFER_FEE));

      const fee = {
        amount: [{ denom: 'ncheq', amount: String(TRANSFER_FEE) }], // Fee amount in ncheq
        gas: '200000', // Gas limit
        payer: from,
      };

      await apis[idx + 1].sdk.signer.signAndBroadcast(
        from,
        [transfer],
        fee,
        'Migration balance payback',
      );
    }),
  );

  return await getBalanceCheqd(to);
}

const getBalanceCheqd = async (account) => BigInt(
  (await checkBalance(account, CHEQD_ENDPOINT)).find(
    (balance) => balance.denom === 'ncheq',
  ).amount,
);

const fmtNCHEQBalance = (ncheq) => `${(Number(ncheq) / 1e9).toFixed(9)} CHEQD`;

async function main() {
  const dock = new DockAPI();

  await dock.init({ address: DOCK_ENDPOINT });
  dock.params = { address: DOCK_ENDPOINT };

  const cheqds = await initCheqd(+ACCOUNT_COUNT);

  const initBalance = await shareBalance(cheqds);
  console.log(
    `Initial main account balance was ${fmtNCHEQBalance(initBalance)}`,
  );

  const spawn = pLimit(10);

  const txs = new Migration(dock, cheqds.apis[0], keyPairs, spawn).txs();

  let globalTxIdx = 0;
  const loopSender = async (cheqd, idx) => {
    let localTxIdx = 0;
    const [{ address }] = await cheqd.sdk.options.wallet.getAccounts();

    const sendTx = async (tx) => {
      ++globalTxIdx;
      ++localTxIdx;

      console.log(
        `Transaction #${globalTxIdx} (#${localTxIdx} from ${address}): ${maybeToJSONString(
          tx,
        )}`,
      );

      return await cheqd.signAndSend(tx);
    };
    const handleTxError = async (err, tx) => {
      err.message = `Failed to execute transaction ${maybeToJSONString(tx)}: ${
        err.message
      }`;

      if (err.message.includes('account sequence mismatch')) {
      } else if (err.message.includes('fetch failed')) {
        cheqd = await new CheqdAPI().init({
          url: CHEQD_ENDPOINT,
          network: CheqdNetwork.Testnet,
          wallet: cheqds.wallets[idx],
        });
      } else if (
        err.message.includes('DID Doc exists')
        || err.message.includes('Resource exists')
        || err.message.includes('tx already exists in cache')
        || err.message.includes('DID Doc not found')
        || err.message.includes('provided')
      ) {
        console.error(err);

        return BREAK;
      } else {
        throw err;
      }

      console.error(err);
    };

    const handleDidTxs = (didTxs) => loopStreamWithCatch(didTxs, sendTx, handleTxError);
    const handleDidTxsError = async (err) => {
      err.message = `Failed to send transaction from ${
        (await cheqds.wallets[idx].getAccounts())[0].address
      }: \n${err.message}`;

      if (
        err.message.includes('No keypair')
        || err.message.includes('Dock DID not found for')
      ) {
        console.error(err);
      } else if (err.message.includes('fetch failed')) {
        cheqd = await new CheqdAPI().init({
          url: CHEQD_ENDPOINT,
          network: CheqdNetwork.Testnet,
          wallet: cheqds.wallets[idx],
        });
      } else {
        throw err;
      }
    };

    await loopStreamWithCatch(txs, handleDidTxs, handleDidTxsError);
  };

  let err;
  try {
    await Promise.all(cheqds.apis.map(loopSender));
  } catch (error) {
    err = error;
  } finally {
    try {
      await timeout(3e3);
      const endBalance = await payback(cheqds);

      console.log(
        `Final main account balance is ${fmtNCHEQBalance(
          endBalance,
        )}. Totally spent ${fmtNCHEQBalance(
          initBalance - endBalance,
        )}. Average per sender is ${fmtNCHEQBalance(
          (initBalance - endBalance) / (BigInt(ACCOUNT_COUNT) + BigInt(1)),
        )}.`,
      );

      console.log(
        `Total transactions sent: ${globalTxIdx}, average per sender: ${
          globalTxIdx / (+ACCOUNT_COUNT + 1)
        }`,
      );
    } catch (error) {
      error.message = `Payback failed: ${error.message}`;

      err ||= error;
    }
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
