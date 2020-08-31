// Helpers for scripts

import types from '../src/types.json';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady, encodeAddress } from '@polkadot/util-crypto';

/**
 * Send the give transaction with the given account URI (secret) and return the block hash
 * @param dock
 * @param senderAccountUri
 * @param txn
 * @returns {Promise<Hash>}
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
 * @returns {Promise<Hash>}
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

/**
 * Load a sr25519 keypair from secret, secret may be "0x" prefixed hex seed
 * or seed phrase or "//DevKey/Derivation/Path".
 * @param secret - string
 * @returns {Promise<KeyPair>}
 */
export async function keypair(seed) {
  await cryptoWaitReady();
  let keyring = new Keyring({ type: 'sr25519' });
  let key = keyring.addFromUri(seed);
  return key
}

/**
 * connect to running node, returning the raw polkadot-js client
 * @param websocket url - string
 * @returns {Promise<KeyPair>}
 */
export async function connect(wsUrl) {
  const extraTypes = {
    Address: 'AccountId',
    LookupSource: 'AccountId',
  };
  return await ApiPromise.create({
    provider: new WsProvider(wsUrl),
    types: {
      ...types,
      ...extraTypes,
    },
  });
}

/**
 * Convert address to Dock address.
 * @param addr
 */
export function asDockAddress(addr) {
  // Currently a Substrate address is used, hence 42
  return encodeAddress(addr, 42);
}
