import { u8aToHex } from '@polkadot/util/index';
import { encodeAddress } from '@polkadot/util-crypto';
import { DockAPI } from '../../src/api';

export async function getFreeBalance(dock, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  return balance.free.toHex();
}

export async function getLockedBalance(dock, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  return balance.reserved.toHex();
}

export async function printFreeBalance(dock, name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s balance is ${balance.free.toHuman()}`);
}

export async function printLockedBalance(dock, name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s locked balance is ${balance.reserved.toHuman()}`);
}

export function getSlotNoFromHeader(dock, header) {
  const slotNo = header.digest.logs[0].asPreRuntime[1];
  return dock.api.createType('u64', slotNo).toNumber();
}

export async function getBlockDetails(dock, blockHash) {
  // Using `api.derive.chain` and not `api.rpc.chain` as block author is needed.
  const header = await dock.api.derive.chain.getHeader(blockHash);
  return { slotNo: await getSlotNoFromHeader(dock, header), blockNo: header.number, author: header.author };
}

async function multiQuery(handle, queries) {
  return new Promise((resolve, reject) => {
    try {
      handle.api.queryMulti(queries, (resp) => {
        resolve(resp);
      })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

export async function getChainData(handle) {
  const [epoch, maxActiveValidators, minEpochLength, activeValidators, epochEndsAt] = await multiQuery(handle, [
    handle.api.query.poAModule.epoch,
    handle.api.query.poAModule.maxActiveValidators,
    handle.api.query.poAModule.minEpochLength,
    handle.api.query.poAModule.activeValidators,
    handle.api.query.poAModule.epochEndsAt,
  ]);

  return {
    epoch: epoch.toNumber(),
    maxActiveValidators: maxActiveValidators.toNumber(),
    minEpochLength: minEpochLength.toNumber(),
    activeValidators: activeValidators.map(encodeAddress),
    epochEndsAt: epochEndsAt.toNumber(),
  };
}

// Generate session key by connecting to the node and returns it.
export async function genSessionKey(nodeAddress, accountUri) {
  const dock = new DockAPI();
  await dock.init({
    address: nodeAddress,
  });
  const account = dock.keyring.addFromUri(accountUri);
  dock.setAccount(account);
  return genSessionKeyForHandle(dock);
}

export async function genSessionKeyForHandle(handle) {
  const key = await handle.api.rpc.author.rotateKeys();
  const hexKey = u8aToHex(key);
  // console.log(hexKey);
  return hexKey;
}

// Associate session key with an account using an extrinsic. Requires validator to have some tokens
export async function setSessionKey(dock, keys, accountUri) {
  const account = dock.keyring.addFromUri(accountUri);
  dock.setAccount(account);
  return setSessionKeyForHandle(dock, keys);
}

export async function setSessionKeyForHandle(handle, keys) {
  const txn = await handle.api.tx.session.setKeys(keys, []);
  // const r = await handle.sendTransaction(txn, false, false);
  const r = await handle.sendTransaction(txn, false);
  return getBlockDetails(handle, r.status.asFinalized);
}

// Associate session key with an account using an extrinsic sent by root. Useful when validator does not have tokens.
export async function setSessionKeyThroughRoot(dock, sudoAccUri, validatorId, keys) {
  const account = dock.keyring.addFromUri(sudoAccUri);
  dock.setAccount(account);
  return setSessionKeyThroughRootWithHandle(dock, validatorId, keys);
}

export async function setSessionKeyThroughRootWithHandle(sudoHandle, validatorId, keys) {
  const txn = sudoHandle.api.tx.sudo.sudo(sudoHandle.api.tx.poAModule.setSessionKey(validatorId, keys));
  const r = await sudoHandle.sendTransaction(txn, false, false);
  // const r = await sudoHandle.sendTransaction(txn, false);
  return getBlockDetails(sudoHandle, r.status.asInBlock);
  // return getBlockDetails(sudoHandle, r.status.asFinalized);
}

// Sudo call to add validator
export async function addValidator(dock, sudoAccUri, validatorId, shortCircuit) {
  const account = dock.keyring.addFromUri(sudoAccUri);
  dock.setAccount(account);
  return addValidatorWithHandle(dock, validatorId, shortCircuit);
}

export async function addValidatorWithHandle(sudoHandle, validatorId, shortCircuit) {
  const txn = sudoHandle.api.tx.sudo.sudo(sudoHandle.api.tx.poAModule.addValidator(validatorId, shortCircuit));
  // const r = await sudoHandle.sendTransaction(txn, false, false);
  const r = await sudoHandle.sendTransaction(txn, false);
  // return getBlockDetails(sudoHandle, r.status.asInBlock);
  return getBlockDetails(sudoHandle, r.status.asFinalized);
}

// Sudo call to remove validator
export async function removeValidator(dock, sudoAccUri, validatorId, shortCircuit) {
  const account = dock.keyring.addFromUri(sudoAccUri);
  dock.setAccount(account);
  return removeValidatorWithHandle(dock, validatorId, shortCircuit);
}

// Sudo call to remove validator
export async function removeValidatorWithHandle(sudoHandle, validatorId, shortCircuit) {
  const txn = sudoHandle.api.tx.sudo.sudo(sudoHandle.api.tx.poAModule.removeValidator(validatorId, shortCircuit));
  const r = await sudoHandle.sendTransaction(txn, false, false);
  return getBlockDetails(sudoHandle, r.status.asInBlock);
}

// Sudo call to swap validator
export async function swapValidator(dock, sudoAccUri, swapOut, swapIn) {
  const account = dock.keyring.addFromUri(sudoAccUri);
  dock.setAccount(account);
  return swapValidatorWithHandle(dock, swapOut, swapIn);
}

export async function swapValidatorWithHandle(sudoHandle, swapOut, swapIn) {
  const txn = sudoHandle.api.tx.sudo.sudo(sudoHandle.api.tx.poAModule.swapValidator(swapOut, swapIn));
  const r = await sudoHandle.sendTransaction(txn, false, false);
  return getBlockDetails(sudoHandle, r.status.asInBlock);
}

export async function setEmissionRewardsStatus(dock, sudoAccUri, status) {
  const account = dock.keyring.addFromUri(sudoAccUri);
  dock.setAccount(account);
  await setEmissionRewardsStatusWithHandle(dock, status);
}

export async function setEmissionRewardsStatusWithHandle(sudoHandle, status) {
  const txn = sudoHandle.api.tx.sudo.sudo(sudoHandle.api.tx.poAModule.setEmissionStatus(status));
  const r = await sudoHandle.sendTransaction(txn, false);
  return getBlockDetails(sudoHandle, r.status.asFinalized);
}

export function epochLength(minEpochLength, countValidators) {
  const rem = minEpochLength % countValidators;
  if (rem === 0) {
    return minEpochLength;
  }
  return minEpochLength + countValidators - rem;
}
