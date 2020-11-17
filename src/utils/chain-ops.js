// Utilities for doing basic operations with chain.

import { Keyring } from '@polkadot/keyring';
import { randomAsHex, cryptoWaitReady, checkAddress } from '@polkadot/util-crypto';
import { u8aToHex, formatBalance } from '@polkadot/util';
import { isHexWithGivenByteSize, asDockAddress } from './codec';
import {getSlotNoFromHeader} from "../../tests/poa/helpers";

// XXX: Following info can be fetched from chain. Integrating in DockAPI object is an options.
const TESTNET_ADDR_PREFIX = 21;
const MAINNET_ADDR_PREFIX = 22;
const DECIMAL = 6;
const SYMBOL = 'DCK';

// The methods below intentionally take an `ApiPromise` object to decouple from DockAPI.

// Check if an address is valid
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
export async function getLastFinalizeBlock(api) {
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
export async function getBlock(api, numberOrHash) {
  const hash = isHexWithGivenByteSize(numberOrHash, 32) ? numberOrHash : (await blockNumberToHash(api, numberOrHash));
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

// Given a block number or block hash, get all extrinsics.
export async function getAllExtrinsicsFromBlock(api, numberOrHash) {
  const block = await getBlock(api, numberOrHash);
  return block.extrinsics;
}

// Given a block number or block hash, get all events.
export async function getAllEventsFromBlock(api, numberOrHash, formatted = true) {
  const hash = isHexWithGivenByteSize(numberOrHash, 32) ? numberOrHash : (await blockNumberToHash(api, numberOrHash));
  const events = await api.query.system.events.at(hash);
  return formatted ? events.map((e) => e.toJSON()) : events;
}

// Format a balance with units or only as number.
function formatBalIfNeeded(bal, format = true) {
  return format ? formatBalance(bal, { decimals: DECIMAL, withSi: true, withUnit: SYMBOL }) : bal.toNumber();
}

// Given a block number or block hash, get all transfer extrinsics. Each returned extrinsic is in form `[sender, recipient, amount]`
export async function getTransfersFromBlock(api, numberOrHash, network, balanceFormatted = true) {
  const extrinsics = await getAllExtrinsicsFromBlock(api, numberOrHash);
  const transfers = [];
  extrinsics.forEach((ext) => {
    if (ext.method && ext.method.section === 'balances' && (ext.method.method === 'transfer' || ext.method.method === 'transferKeepAlive')) {
      const bal = formatBalIfNeeded(ext.method.args[1], balanceFormatted);
      transfers.push([asDockAddress(ext.signer, network), asDockAddress(ext.method.args[0], network), bal]);
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

// Transfer tokens and return txn hash. Converts to mirco tokens first
export async function transferDock(api, senderKeypair, recipAddr, amount) {
  return transferMicroDock(api, senderKeypair, recipAddr, docksToMicroDocks(amount));
}

// Transfer micro tokens and return txn hash.
export async function transferMicroDock(api, senderKeypair, recipAddr, amount) {
  checkValidMicroAmount(amount);
  const txn = api.tx.balances.transfer(recipAddr, amount);
  return txn.signAndSend(senderKeypair);
}

// Fetch a block by block number or block hash
export async function getBlockDerived(api, numberOrHash) {
  const hash = isHexWithGivenByteSize(numberOrHash, 32) ? numberOrHash : (await blockNumberToHash(api, numberOrHash));
  const block = await api.derive.chain.getHeader(hash);
  return block;
}

export async function getBlockAuthor(dock, blockHash) {
  // Using `api.derive.chain` and not `api.rpc.chain` as block author is needed.
  const header = await dock.api.derive.chain.getHeader(blockHash);
  return header.author;
}
