// import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

import { DockAPI } from '../src/api';
import { u8aToHex } from '@polkadot/util';


// Generate session key by connecting to the node and returns it.
async function genSessionKey(nodeAddress, accountUri) {
  const dock = new DockAPI();
  await dock.init({
    address: nodeAddress,
  });
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(accountUri);
  dock.setAccount(account);
  const key = await dock.api.rpc.author.rotateKeys();
  const hexKey = u8aToHex(key);
  console.log(hexKey);
  return hexKey;
}

// Associate session key with an account using an extrinsic. Requires validator to have some tokens
async function setSessionKey(dock, keys, accountUri) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri(accountUri);
  dock.setAccount(account);
  const txn = await dock.api.tx.session.setKeys(keys, []);
  // console.log(txn);
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

// Associate session key with an account using an extrinsic sent by root. Useful when validator does not have tokens.
async function setSessionKeyByProxy(dock, validatorId, keys) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.setSessionKey(validatorId, keys));
  // console.log(txn);
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

// Sudo call to add validator
async function addValidator(dock, validatorId, force) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.addValidator(validatorId, force));
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

// Sudo call to remove validator
async function removeValidator(dock, validatorId, force) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.removeValidator(validatorId, force));
  const r = await dock.sendTransaction(txn, false);
  console.log(`Transaction finalized at blockHash ${r.status.asFinalized}`);
  return r;
}

// Sudo call to swap validator
async function swapValidator(dock, swapOut, swapIn) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.swapValidator(swapOut, swapIn));
  const r = await dock.sendTransaction(txn, false);
  console.log(r.status.asFinalized);
  return r;
}

async function printBalance(name, account) {
  const dock = new DockAPI();
  await dock.init({
    address: 'ws://localhost:9944',
  });
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s balance is ${balance.free}`);
}

// Prototyping code.
async function main() {
  const dock = new DockAPI();
  await dock.init({
    address: 'ws://localhost:9944',
  });

  // Charlie listens at 'ws://localhost:9955', Dave at 'ws://localhost:9966', Eve at 'ws://localhost:9977'

  const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  const charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';
  const charlieNode = 'ws://localhost:9955';

  const dave = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';
  const daveNode = 'ws://localhost:9966';

  const eve = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw';
  const eveNode = 'ws://localhost:9977';

  const ferdie = '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL';

  // Each chunk of code below generates a session key, associates that with the account id, adds the account
  // as validator and removes it. Comment/uncomment appropriately

  // const sessKey = await genSessionKey(charlieNode, '//Charlie');
  // await setSessionKey(dock, sessKey, '//Charlie');
  // await setSessionKeyByProxy(dock, charlie, sessKey);
  // await addValidator(dock, charlie, false);
  // await printBalance('Alice', alice);
  // await removeValidator(dock, charlie, false);
  // await printBalance('Alice', alice);

  // const sessKey = await genSessionKey(daveNode, '//Dave');
  // await setSessionKey(dock, sessKey, '//Dave');
  // await addValidator(dock, dave, false);
  // await removeValidator(dock, dave, false);

  // const sessKey = await genSessionKey(eveNode, '//Eve');
  // await setSessionKey(dock, sessKey, '//Eve');
  // await addValidator(dock, eve, false);
  // await removeValidator(dock, eve, false);

  // For testing removal of all validators
  // await removeValidator(dock, alice, false);
  // await removeValidator(dock, bob, false);

  // Testing swap of validator
  // await swapValidator(dock, charlie, dave);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
