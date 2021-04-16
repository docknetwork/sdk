import { DockAPI } from '../src/api';

require('dotenv').config();

async function getHandle(endpoint) {
  const handle = new DockAPI();
  await handle.init({ address: endpoint });
  return handle;
}

// Make multiple connections to the chain
async function getHandles(count, endpoint) {
  const handles = [];
  while (handles.length < count) {
    handles.push(getHandle(endpoint));
  }
  return Promise.all(handles);
}

// Get balance of an account.
async function getBalance(handle, address) {
  return parseInt((await handle.poaModule.getBalance(address)));
}

// Get balance of given list of accounts.
async function getBalances(handle, addresses) {
  return Promise.all(addresses.map((a) => getBalance(handle, a)));
}

// Get balance of given list of accounts but make the queries multiple times to simulate lots of queries
async function getBalancesRepeatedly(count, handle, addresses) {
  const promises = [];
  while (promises.length < count) {
    promises.push(Promise.all(addresses.map((a) => getBalance(handle, a))));
  }
  return Promise.all(promises);
}

async function getBalanceWithAllHandles(handles, address) {
  return Promise.all(handles.map((h) => getBalance(h, address))).then(() => {
    console.log('done getting balance');
  });
}

async function getBalancesWithAllHandles(handles, addresses) {
  return Promise.all(handles.map((h) => getBalances(h, addresses))).then(() => {
    console.log('done getting balances');
  });
}

async function getBalancesWithAllHandlesRepeat(handles, addresses, count) {
  return Promise.all(handles.map((h) => getBalancesRepeatedly(count, h, addresses))).then(() => {
    console.log('done getting balances');
  });
}

async function main() {
  // Websocket server at localhost:9000
  const endpoint = 'ws://localhost:9900';

  const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  const charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';
  const dave = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';
  const eve = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw';
  const ferdie = '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL';

  const count = 10;
  const handles = await getHandles(count, endpoint);

  await getBalanceWithAllHandles(handles, alice);
  await getBalancesWithAllHandles(handles, [alice, bob, charlie, dave, eve, ferdie]);
  await getBalancesWithAllHandlesRepeat(handles, [alice, bob, charlie, dave, eve, ferdie], 100);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
