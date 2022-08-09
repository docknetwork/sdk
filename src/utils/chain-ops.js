// Utilities for doing basic operations with chain.

import { Keyring } from '@polkadot/keyring';
import {
  randomAsHex, cryptoWaitReady, checkAddress, blake2AsU8a,
} from '@polkadot/util-crypto';
import { u8aToHex, formatBalance } from '@polkadot/util';
import { isHexWithGivenByteSize } from './codec';

// XXX: Following info can be fetched from chain. Integrating in DockAPI object is an option.
const TESTNET_ADDR_PREFIX = 21;
const MAINNET_ADDR_PREFIX = 22;
const DECIMAL = 6;
const SYMBOL = 'DCK';

// The methods below intentionally take an `ApiPromise` object to decouple from `DockAPI` object.

/**
 * Return true if an address is valid according to the provided network, false otherwise.
 * @param {string} address - The address in SS58 format.
 * @param {string} network - Address if from testnet or mainnet. Accepts only `test` and `main`.
 * @returns {boolean} true if the address is valid, false otherwise.
 */
export function validateAddress(address, network = 'test') {
  if (network !== 'test' && network !== 'main') {
    throw new Error('Network must be "test" or "main"');
  }
  const prfx = network === 'test' ? TESTNET_ADDR_PREFIX : MAINNET_ADDR_PREFIX;
  const res = checkAddress(address, prfx);
  if (res[0] === true) {
    return true;
  }
  console.error(`Error while parsing address ${res[1]}`);
  return false;
}

// Generate an account. If `secretUri` is not passed, a random one is generated
export async function generateAccount({ secretUri, type = 'sr25519', network = 'test' }) {
  if (['ed25519', 'sr25519', 'ecdsa'].indexOf(type) === -1) {
    throw new Error(`${type} is not a valid type`);
  }
  if (network !== 'test' && network !== 'main') {
    throw new Error('Network must be "test" or "main"');
  }

  if (secretUri === undefined) {
    // eslint-disable-next-line no-param-reassign
    secretUri = randomAsHex(32);
  }

  const prfx = network === 'test' ? TESTNET_ADDR_PREFIX : MAINNET_ADDR_PREFIX;

  await cryptoWaitReady();
  // @ts-ignore
  const keyring = new Keyring({ type, ss58Format: prfx });
  const keypair = keyring.addFromUri(secretUri);
  return [secretUri, keypair.address, keypair];
}

// Get the last authored block
export async function getLastBlock(api) {
  const { block } = await api.rpc.chain.getBlock();
  return block;
}

// Get the last finalized block
export async function getLastFinalizedBlock(api) {
  const h = await api.rpc.chain.getFinalizedHead();
  return getBlock(api, u8aToHex(h));
}

// Given a block number, return the block hash
export async function blockNumberToHash(api, number) {
  if (Number.isInteger(number) && number > 0) {
    const h = await api.rpc.chain.getBlockHash(number);
    return u8aToHex(h);
  }
  throw new Error(`${number} is not a valid block number`);
}

// Fetch a block by block number or block hash
export async function getBlock(api, numberOrHash, withAuthor = false) {
  const hash = isHexWithGivenByteSize(numberOrHash, 32) ? numberOrHash : (await blockNumberToHash(api, numberOrHash));
  if (withAuthor) {
    const { block, author } = await api.derive.chain.getBlock(hash);
    return { block, author };
  }
  const { block } = await api.rpc.chain.getBlock(hash);
  return block;
}

// Given a block header or block, extract the block number
export function getBlockNo(headerOrBlock) {
  if ((typeof headerOrBlock.header) === 'object') {
    return headerOrBlock.header.number.toNumber();
  }
  return headerOrBlock.number.toNumber();
}

/**
 * Given a block number or block hash, get all extrinsics.
 * @param {*} api
 * @param {*} numberOrHash
 * @param {*} includeAllExtrinsics - If false, returns only successful extrinsics.
 */
export async function getAllExtrinsicsFromBlock(api, numberOrHash, includeAllExtrinsics = true) {
  const block = await getBlock(api, numberOrHash);
  let { extrinsics } = block;
  if (includeAllExtrinsics === false) {
    // Will only include successful extrinsics and using event `ExtrinsicSuccess` which hash index '0x0000' (1st index of 1st pallet which is system)
    const events = await getAllEventsFromBlock(api, block.header.number.toNumber(), true);
    const filteredExtrinsics = [];
    events.forEach((event) => {
      if (event.event && event.event.index === '0x0000') {
        // event corresponds to `ExtrinsicSuccess` and event.phase.applyExtrinsic is the extrinsic index in the block
        filteredExtrinsics.push(extrinsics[event.phase.applyExtrinsic]);
      }
    });
    extrinsics = filteredExtrinsics;
  }
  return extrinsics;
}

/**
 * Given a block number or block hash, get all events.
 * @param {*} api
 * @param {*} numberOrHash
 * @param {*} formatted
 */
export async function getAllEventsFromBlock(api, numberOrHash, formatted = true) {
  const hash = isHexWithGivenByteSize(numberOrHash, 32) ? numberOrHash : (await blockNumberToHash(api, numberOrHash));
  const events = await api.query.system.events.at(hash);
  return formatted ? events.map((e) => e.toJSON()) : events;
}

export async function getTransferEventsFromBlock(api, numberOrHash, formatted = true) {
  const events = await getAllEventsFromBlock(api, numberOrHash, formatted);
  return events.filter((event) => event.event && event.event.index === '0x0302');
}

// Format a balance with units or only as number.
function formatBalIfNeeded(bal, format = true) {
  return format ? formatBalance(bal, { decimals: DECIMAL, withSi: true, withUnit: SYMBOL }) : bal.toNumber();
}

/**
 * Given a block number or block hash, get all transfer extrinsics. Each returned extrinsic is in form `[sender, recipient, amount]`
 * @param {*} api
 * @param {*} numberOrHash
 * @param {*} balanceFormatted
 * @param {*} includeAllTransfers - If false, will only return successful transfer extrinsics
 */
export async function getTransferExtrinsicsFromBlock(api, numberOrHash, balanceFormatted = true, includeAllTransfers = true) {
  const extrinsics = await getAllExtrinsicsFromBlock(api, numberOrHash, includeAllTransfers);
  const transfers = [];
  extrinsics.forEach((ext) => {
    if (ext.method && ext.method.section === 'balances' && (ext.method.method === 'transfer' || ext.method.method === 'transferKeepAlive')) {
      const bal = formatBalIfNeeded(ext.method.args[1], balanceFormatted);
      const hash = u8aToHex(blake2AsU8a(ext.toU8a(), 256));
      transfers.push([ext.signer.toString(), ext.method.args[0].toString(), bal, hash]);
    }
  });
  return transfers;
}

// Get free balance of an account.
export async function getBalance(api, address, formatted = true) {
  const { data: { free } } = await api.query.system.account(address);
  return formatBalIfNeeded(free, formatted);
}

function checkValidMicroAmount(micros) {
  // TODO: this should handle upto 64 bits
  if (!Number.isSafeInteger(micros) || micros < 0) {
    throw new Error(`Amount must be a positive integer and must fit in 53 bits but was ${micros}`);
  }
}

// Convert tokens to micros
export function docksToMicroDocks(amount) {
  // Token has `DECIMAL` decimal places
  const micros = amount * (10 ** DECIMAL);
  checkValidMicroAmount(micros);
  return micros;
}

/**
 * Transfer tokens and return txn hash. Converts to mirco tokens first
 * @param api
 * @param senderKeypair
 * @param recipAddr
 * @param amount - Amount in tokens
 * @param sendTxn - If true, will send the transaction and return transaction hash otherwise return the signed transaction
 * @returns {Promise<*>}
 */
export async function transferDock(api, senderKeypair, recipAddr, amount, sendTxn = true) {
  return transferMicroDock(api, senderKeypair, recipAddr, docksToMicroDocks(amount), sendTxn);
}

/**
 * Transfer micro tokens and return txn hash.
 * @param api
 * @param senderKeypair
 * @param recipAddr
 * @param amount - Amount in micro (10^-6) tokens
 * @param sendTxn - If true, will send the transaction and return transaction hash otherwise return the signed transaction
 * @returns {Promise<*>}
 */
export async function transferMicroDock(api, senderKeypair, recipAddr, amount, sendTxn = true) {
  checkValidMicroAmount(amount);
  const txn = api.tx.balances.transfer(recipAddr, amount);
  return sendTxn ? txn.signAndSend(senderKeypair) : txn.signAsync(senderKeypair);
}
