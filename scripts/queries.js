import { DockAPI } from '../src/api';

require('dotenv').config();

const { FullNodeEndpoint } = process.env;

async function getHandle(endpoint) {
  // console.log('creating handle');
  const handle = new DockAPI();
  await handle.init({ address: 'ws://localhost:9000' });
  // await handle.init({ address: 'wss://testnet-b1.dock.io' });
  // await handle.init({ address: 'ws://localhost:9988' });
  // console.log('done creating handle');
  return handle;
}

// Make multiple connections to the chain
async function getHandles(count, endpoint) {
  const handles = [];
  while (handles.length < count) {
    handles.push(getHandle(endpoint));
  }
  return Promise.all(handles);
  // return handles;
}

// Get balance of an account.
async function getBalance(handle, address) {
  const bal = await handle.poaModule.getBalance(address);
  // console.log(`Balance is ${parseInt(bal[0])}`);
}

// Get balance of given list of accounts.
async function getBalances(handle, addresses) {
  return Promise.all(addresses.map((a) => {
    return getBalance(handle, a);
  }));
}

// Get balance of given list of accounts but make the queries multiple times to simulate lots of queries
async function getBalancesRepeatedly(count, handle, addresses) {
  const promises = [];
  while (promises.length < count) {
    promises.push(Promise.all(addresses.map((a) => {
      return getBalance(handle, a);
    })));
  }
  return Promise.all(promises);
}

async function main() {
  const endpoint = 'ws://localhost';
  const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  const charlie = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';
  const dave = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';
  const eve = '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw';
  const ferdie = '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL';

  const count = 2;
  const handles = await getHandles(count, endpoint);

  // for (let i=0; i < count; i++) {
  //   await getBalance(handles[i], alice);
  // }

  // console.log(handles);
  /* handles.map((h) => {
    getBalance(h, endpoint);
  }); */

  /* handles.map((h) => {
    getBalance(h, endpoint);
  }); */

  /* await Promise.all(handles.map(function(h) {
    return getBalance(h, alice);
  })).then(function() {
    console.log('done getting balance');
  });
   */

  /* await Promise.all(handles.map(function(h) {
    // return getBalances(h, [alice, bob, charlie]);
    return getBalances(h, [alice, bob, charlie, dave, eve, ferdie]);
  })).then(function() {
    console.log('done getting balances');
  }); */

  await Promise.all(handles.map(function(h) {
    // return getBalances(h, [alice, bob, charlie]);
    return getBalancesRepeatedly(2000, h, [alice, bob, charlie, dave, eve, ferdie]);
  })).then(function() {
    console.log('done getting balances');
  });
  
  /* const a = Promise.all(handles.map(function(h) {
    return getBalance(h, alice);
  }));
  await a; */
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
