// Helpers for scripts

import { Keyring } from "@polkadot/api";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { formatBalance } from "@polkadot/util";
import { bufferCount, map as mapRx } from "rxjs/operators";
import {
  always,
  ifElse,
  has,
  prop,
  when,
  isNil,
  either,
  equals,
  o,
  mapObjIndexed,
  curry,
  __,
  unless,
} from "ramda";
import { Observable } from "rxjs";

import dock from "../src";
import { DockAPI } from '../src';

/**
 * Send the give transaction with the given account URI (secret) and return the block hash
 * @param dock
 * @param senderAccountUri
 * @param txn
 * @returns {Promise}
 */
export async function sendTxnWithAccount(
  dock,
  senderAccountUri,
  txn,
  waitForFinalization = true
) {
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
    if (argv[3].toLowerCase() === "true") {
      shortCircuit = true;
    } else if (argv[3].toLowerCase() === "false") {
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
export async function sendBatch(
  dock,
  txs,
  senderAddress,
  waitForFinalization = false
) {
  const txBatch = dock.api.tx.utility.batch(txs);
  console.log(`Batch size is ${txBatch.encodedLength}`);
  console.info(
    `Payment info of batch is ${await txBatch.paymentInfo(senderAddress)}`
  );

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
  const keyring = new Keyring({ type: "sr25519" });
  return keyring.addFromUri(seed);
}

/**
 * connect to running node, returning the raw polkadot-js client
 * @param wsUrl - string
 * @returns {Promise}
 */
 export async function connect(wsUrl) {
  /*return await ApiPromise.create({
    provider: new WsProvider(wsUrl),
    typesBundle,
  });*/
  const dock = new DockAPI();
  await dock.init({
    address: wsUrl,
  });
  return dock;
}

export function median(numbers) {
  let mid;
  const numsLen = numbers.length;
  numbers.sort();

  if (
    numsLen % 2 ===
    0 // is even
  ) {
    // average of two middle numbers
    mid = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else {
    // is odd
    // middle number only
    mid = numbers[(numsLen - 1) / 2];
  }
  return mid;
}

/**
 * Picks a prop of an object only if it's the own property of the object itself.
 *
 * @template T
 * @param {string} propName
 * @param {Object<string, T>} object
 * @returns {T?}
 */
export const ownProp = ifElse(has, prop, always(void 0));

/**
 * Asserts a value not to be `null` or `undefined`.
 */
export const assertNotNil = when(isNil, () => {
  throw new Error("Value can't be `null` or `undefined`");
});

/**
 * Constructs a finite `Number` from the given value.
 * Throws an error in case if the value isn't finite.
 *
 * @param {*} input
 * @returns {number}
 */
export const finiteNumber = o(
  unless(isFinite, (value) => {
    throw new Error(`Invalid number provided: ${value}`);
  }),
  Number
);

/**
 * Executes provided function only if the value is not nil.
 * Throws an error if the value is either `null` or `undefined`.
 *
 * @template T
 * @template R
 * @param {function(T): R} function
 * @param {T?} value
 * @returns {R}
 */
export const notNilAnd = o(__, assertNotNil);

/**
 * Parses an env with the given name if it's the own property of the `process.env` object.
 *
 * @template T
 * @param {function(string): T} parse
 * @param {string} name
 * @returns {T}
 */
export const parseEnv = curry((parse, name) => {
  const value = ownProp(name, process.env);

  try {
    return parse(value);
  } catch (e) {
    throw new Error(`Failed to parse \`${name}\`: ${e}`);
  }
});

/**
 * Parses object of env variables using supplied parsers.
 *
 * @template T
 * @param {Object<string, function(string):T>} config
 * @returns {Object<string, T>}
 */
export const envObj = mapObjIndexed(parseEnv);

/**
 * Batches extrinsics received from the observable.
 *
 * @param {*} api
 * @param {number} limit
 * @param {Observable<import("@polkadot/types/interfaces").Extrinsic>} extrs$
 * @returns {Observable<import("@polkadot/types/interfaces").Extrinsic>}
 */
export const batchExtrinsics = curry((api, limit, extrs$) =>
  extrs$.pipe(
    bufferCount(limit),
    mapRx((batch) =>
      batch.length === 1 ? batch[0] : api.tx.utility.batch(batch)
    )
  )
);

/**
 * Creates a promise that will be rejected after the given time.
 *
 * @param {number} time
 * @returns {Promise<void>}
 */
export const rejectTimeout = (time) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout is exceeded")), time)
  );

/**
 * Creates a promise that will be either resolved before the specified
 * time or rejected after.
 *
 * @template T
 * @param {number} time
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
export const timeout = curry((time, promise) =>
  Promise.race([rejectTimeout(time), promise])
);

/**
 * Formats given value as DOCK token amount.
 *
 * @param {BN} value
 * @returns {string}
 */
export const formatDock = (value) =>
  formatBalance(value, { decimals: 6, withSi: true, withUnit: "DCK" });

/**
 * Enhances supplied function by providing access to the initialized global dock API.
 *
 * Global dock API object will be initialized with the given params before passing to the function,
 * and will be disconnected when the promise will be either resolved or rejected.
 *
 * @template T
 * @param {Object} params
 * @param {function(DockAPI, ...*): Promise<T>}
 * @returns {function(...*): Promise<T>}
 */
export const withDockAPI = curry((params, fn) => async (...args) => {
  console.log("Connecting...");
  let err, res;

  try {
    await dock.init(params);
    res = await fn(dock, ...args);
  } catch (e) {
    err = e;
  } finally {
    console.log("Disconnecting...");
    await dock.disconnect();

    if (err) {
      throw err;
    } else {
      return res;
    }
  }
});

/**
 * Converts "true" and non-zero to `true`, other values to `false`.
 *
 * @param {*} value
 * @returns {bool}
 */
export const parseBool = either(equals("true"), o(Boolean, Number));
