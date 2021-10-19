// Helpers for scripts

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import typesBundle from '@docknetwork/node-types';

/**
 * Send the give transaction with the given account URI (secret) and return the block hash
 * @param dock
 * @param senderAccountUri
 * @param txn
 * @returns {Promise}
 */
export async function sendTxnWithAccount(dock, senderAccountUri, txn, waitForFinalization = true) {
  const account = dock.keyring.addFromUri(senderAccountUri);
  dock.setAccount(account);
  const { status } = await dock.signAndSend(txn, waitForFinalization);
  return waitForFinalization ? status.asFinalized : status.asInBlock;
}

/**
 * Add or remove a validator. The add or remove function is passed.
 * XXX: This function is tightly coupled with scripts and exists merely to avoid code duplication
 * @param dock
 * @param argv Array of command line arguments
 * @param func Function to add or remove
 * @param senderAccountUri
 * @returns {Promise}
 */
export async function validatorChange(dock, argv, func, senderAccountUri) {
  let shortCircuit;
  if (argv.length === 4) {
    if (argv[3].toLowerCase() === 'true') {
      shortCircuit = true;
    } else if (argv[3].toLowerCase() === 'false') {
      shortCircuit = false;
    } else {
      throw new Error(`Should be true or false but was ${argv[3]}`);
    }
  } else {
    shortCircuit = false;
  }
  const txn = func(argv[2], shortCircuit, true);
  return sendTxnWithAccount(dock, senderAccountUri, txn);
}

export async function getBalance(api, account) {
  const { data: balance } = await api.query.system.account(account);
  return [balance.free.toHex(), balance.reserved.toHex()];
}

/**
 * Send a batch of txns and print relevant info like size, weight, block included and fees paid.
 * @param {*} txs
 * @param {*} senderAddress
 */
export async function sendBatch(dock, txs, senderAddress, waitForFinalization = false) {
  const txBatch = dock.api.tx.utility.batch(txs);
  console.log(`Batch size is ${txBatch.encodedLength}`);
  console.info(`Payment info of batch is ${(await txBatch.paymentInfo(senderAddress))}`);

  const bal1 = await getBalance(dock.api, senderAddress);
  console.time(`Time for sign and send for batch of size ${txs.length}`);
  const signedExtrinsic = await dock.signExtrinsic(txBatch);
  console.time(`Time for send for batch of size ${txs.length}`);
  const r = await dock.send(signedExtrinsic, waitForFinalization);
  if (waitForFinalization) {
    console.info(`block ${r.status.asFinalized}`);
  } else {
    console.info(`block ${r.status.asInBlock}`);
  }
  console.timeEnd(`Time for sign and send for batch of size ${txs.length}`);
  console.timeEnd(`Time for send for batch of size ${txs.length}`);
  const bal2 = await getBalance(dock.api, senderAddress);
  console.info(`Fee paid is ${parseInt(bal1[0]) - parseInt(bal2[0])}`);
}

/**
 * Load a sr25519 keypair from secret, secret may be "0x" prefixed hex seed
 * or seed phrase or "//DevKey/Derivation/Path".
 * @param seed - string
 * @returns {Promise}
 */
export async function keypair(seed) {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  return keyring.addFromUri(seed);
}

/**
 * connect to running node, returning the raw polkadot-js client
 * @param wsUrl - string
 * @returns {Promise}
 */
export async function connect(wsUrl) {
  return await ApiPromise.create({
    provider: new WsProvider(wsUrl),
    typesBundle,
  });
}

export function median(numbers) {
  let mid;
  const numsLen = numbers.length;
  numbers.sort();

  if (
    numsLen % 2 === 0 // is even
  ) {
    // average of two middle numbers
    mid = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else { // is odd
    // middle number only
    mid = numbers[(numsLen - 1) / 2];
  }
  return mid;
}
