import { randomAsHex } from '@polkadot/util-crypto';

import { FullNodeEndpoint, TestAccountURI } from '../tests/test-constants';

import { DockAPI } from '../src/api';

import {
  createNewDockDID, createKeyDetail,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';


const dock = new DockAPI();

async function printBalance(name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s balance is ${balance.free}`);
}

async function getBalance(account) {
  const { data: balance } = await dock.api.query.system.account(account);
  return balance.free.toHex();
}

async function getBlockDetails(dock, blockHash) {
  const header = await dock.api.derive.chain.getHeader(blockHash);
  // console.log(`Block header is ${header}`);
  const slotNo = header.digest.logs[0].asPreRuntime[1];
  // console.log(`Slot number is ${slotNo}`);
  console.log(`Slot number is ${dock.api.createType('u64', slotNo)} and Block number is ${header.number}`);
  console.log(`Block author's key is ${header.author}`);
  return [dock.api.createType('u64', slotNo), header.number, header.author];
}

async function registerNewDID() {
  // DID will be generated randomly
  const dockDID = createNewDockDID();

  // Generate first key with this seed. The key type is Sr25519
  const firstKeySeed = randomAsHex(32);

  // Generate keys for the DID.
  const firstPair = dock.keyring.addFromUri(firstKeySeed, null, 'sr25519');
  const publicKey = getPublicKeyFromKeyringPair(firstPair);

  // The controller is same as the DID
  const keyDetail = createKeyDetail(publicKey, dockDID);

  // console.log('Submitting new DID', dockDID, publicKey);

  const transaction = dock.did.new(dockDID, keyDetail);
  const { status } = await dock.sendTransaction(transaction);
  const blockHash = status.asFinalized;
  console.log(`Transaction finalized at blockHash ${blockHash}`);
  /* const header = await dock.api.derive.chain.getHeader(blockHash);
  // console.log(`Block header is ${header}`);
  const slotNo = header.digest.logs[0].asPreRuntime[1];
  // console.log(`Slot number is ${slotNo}`);
  console.log(`Slot number is ${dock.api.createType('u64', slotNo)} and Block number is ${header.number}`);
  console.log(`Block author is ${header.author}`);
  return header.author; */
  return (await getBlockDetails(dock, blockHash))[2];
}

async function disableEmissions(dock) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.setEmissionStatus(false));
  const { status } = await dock.sendTransaction(txn);
  const blockHash = status.asFinalized;
  console.log(`Transaction finalized at blockHash ${blockHash}`);
  return (await getBlockDetails(dock, blockHash))[2];
}

async function txnByRoot(dock) {
  console.log('Setting sdk account...');
  const account = dock.keyring.addFromUri('//Alice');
  dock.setAccount(account);
  // const txn = dock.api.tx.sudo.sudoUncheckedWeight(dock.api.tx.poAModule.setMaxActiveValidators(8), 0);
  const txn = dock.api.tx.sudo.sudo(dock.api.tx.poAModule.setMaxActiveValidators(8));
  // const txn = dock.api.tx.poAModule.setMaxActiveValidators(8);
  const { status } = await dock.sendTransaction(txn);
  const blockHash = status.asFinalized;
  console.log(`Transaction finalized at blockHash ${blockHash}`);
  return (await getBlockDetails(dock, blockHash))[2];
}

// Prototyping code.
async function main() {
  await dock.init({
    address: FullNodeEndpoint,
  });

  const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

  // Alice will send transaction
  const account = dock.keyring.addFromUri(TestAccountURI);
  dock.setAccount(account);

  const d = await dock.api.rpc.author;
  console.log(d);
  process.exit(0);
  // console.log('dock.api', dock.api);

  // await disableEmissions(dock);

  await printBalance('alice', alice);
  await printBalance('bob', bob);
  const aliceBalOld = await getBalance(alice);
  const bobBalOld = await getBalance(bob);

  // const blockAuthor = await registerNewDID();
  const blockAuthor = await txnByRoot(dock);

  // XXX: This code is not extensible as it requires only 2 nodes running. Sufficient for now.
  if (blockAuthor != alice && blockAuthor != bob) {
    throw new Error(`Block author must be Alice or Bob but was ${blockAuthor}`);
  }
  if (blockAuthor == alice) {
    console.log('Block author is Alice');
  } else {
    console.log('Block author is Bob');
  }

  await printBalance('alice', alice);
  await printBalance('bob', bob);
  const aliceBalNew = await getBalance(alice);
  const bobBalNew = await getBalance(bob);
  // process.exit(0);

  if (blockAuthor == alice) {
    if (aliceBalNew != aliceBalOld) {
      throw new Error('Block author was Alice still its balance changed');
    }
    if (bobBalNew != bobBalOld) {
      throw new Error('Block author was Alice but Bob\'s balance changed');
    }
  } else {
    if (aliceBalNew >= aliceBalOld) {
      throw new Error('Block author was Bob still Alice\'s balance has not decreased.');
    }
    if (bobBalNew <= bobBalOld) {
      throw new Error('Block author was Bob but Bob\'s balance has not increased');
    }
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
