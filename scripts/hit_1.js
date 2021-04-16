import { randomAsHex } from '@polkadot/util-crypto';
import dock, { DockAPI } from '../src/api';
import {
  createNewDockDID, createKeyDetail, createSignedKeyUpdate, createSignedDidRemoval, getHexIdentifierFromDID,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { sendBatch } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint, SudoSecretURI, EndowedSecretURI } = process.env;

async function fillBlock() {
  const r = dock.api.tx.system.fillBlock(1);
  const account = dock.keyring.addFromUri(SudoSecretURI);
  dock.setAccount(account);
  const txn = dock.api.tx.sudo.sudo(r);
  const { status } = await dock.signAndSend(txn);
  const blockHash = status.asFinalized;
  console.log(`Transaction finalized at blockHash ${blockHash}`);
}

/*
Even 5550 extrinsics fail due to block limit
----
Sending 5500 DID write extrinsics in a batch
Batch size is 544509
Payment info of batch is {"weight":896417461000,"class":"Normal","partialFee":125544610}
block 0xde8e3edb4ad3dc730f6298d7c60e44cf806ec8c0fa90a59e4ab71a8ecd295491
Fee paid is 125544610
*/
async function sendDIDTxns(count, waitForFinalization = true) {
  console.info(`Sending ${count} DID write extrinsics in a batch`);
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txs = [];
  const didPairs = [];
  while (txs.length < count) {
    const did = createNewDockDID();
    const seed = randomAsHex(32);
    const pair = dock.keyring.addFromUri(seed, null, 'sr25519');
    const publicKey = getPublicKeyFromKeyringPair(pair);
    const keyDetail = createKeyDetail(publicKey, did);
    const tx = dock.did.createNewTx(did, keyDetail);
    txs.push(tx);
    didPairs.push([did, pair]);
  }

  await sendBatch(dock, txs, account.address, waitForFinalization);
  return didPairs;
}

/*
3400 extrinsics fail due to block limit
----
Sending 3300 key update extrinsics in a batch
Batch size is 452109
Payment info of batch is {"weight":881057061000,"class":"Normal","partialFee":125452210}
block 0x14e851a4ffe6698033bba90f74cc0ba2d2348b39dd2d93178e0bb6114f81af4a
Fee paid is 125452210
*/
async function sendKeyUpdateTxns(count, didPairs) {
  console.info(`Sending ${count} key update extrinsics in a batch`);
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txs = [];
  let j = 0;
  while (txs.length < count) {
    const did = didPairs[j][0];
    const currentPair = didPairs[j][1];
    const seed = randomAsHex(32);
    const newPair = dock.keyring.addFromUri(seed, null, 'sr25519');
    const publicKey = getPublicKeyFromKeyringPair(newPair);
    const [keyUpdate, signature] = await createSignedKeyUpdate(dock.did, did, publicKey, currentPair);
    const tx = dock.did.createUpdateKeyTx(keyUpdate, signature);
    txs.push(tx);
    didPairs[j][1] = newPair;
    j++;
  }

  await sendBatch(dock, txs, account.address);
  return didPairs;
}

/*
3500 extrinsics fail due to block limit
----
Sending 3400 DID remove extrinsics in a batch
Batch size is 350209
Payment info of batch is {"weight":890755261000,"class":"Normal","partialFee":125350310}
block 0x1f8ab814bf875094f39386bc8c1e0f6f24d41be7c58b5cab3e5d4cc9de022013
Fee paid is 125350310
*/
async function sendRemoveTxns(count, didPairs, waitForFinalization = true) {
  console.info(`Sending ${count} DID remove extrinsics in a batch`);
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txs = [];
  let j = 0;
  while (txs.length < count) {
    const did = didPairs[j][0];
    const currentPair = didPairs[j][1];
    const [remove, signature] = await createSignedDidRemoval(dock.did, did, currentPair);
    const tx = dock.did.createRemoveTx(remove, signature);
    txs.push(tx);
    j++;
  }

  await sendBatch(dock, txs, account.address, waitForFinalization);
}

/*
2000 extrinsics fail due to websocket capacity as each blob is close to 1 KB. Error 'WebSocket at Capacity: Exceeded max fragments.'
----
Sending 1500 blob write extrinsics in a batch
Batch size is 1692009
Payment info of batch is {"weight":397631211000,"class":"Normal","partialFee":126692110}
block 0x196d7ad5053e30cabf8e3bdf85d767f278e83ea6c0b2bd694ea73a4a50274eaa
Fee paid is 126692110
*/
async function sendBlobTxns(count, didPairs) {
  console.info(`Sending ${count} blob write extrinsics in a batch`);
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txs = [];
  let j = 0;
  const blobIds = [];
  while (txs.length < count) {
    const did = didPairs[j][0];
    const pair = didPairs[j][1];
    const blobId = randomAsHex(32);
    const blob = {
      id: blobId,
      blob: randomAsHex(995),
      author: getHexIdentifierFromDID(did),
    };
    const tx = dock.blob.createNewTx(blob, pair);
    txs.push(tx);
    blobIds.push(blobId);
    j++;
  }

  await sendBatch(dock, txs, account.address);

  return blobIds;
}

/*
7500 extrinsics fail due to block limit
----
Sending 7000 anchor extrinsics in a batch
Batch size is 245009
Payment info of batch is {"weight":888890461000,"class":"Normal","partialFee":2576100000}
block 0x1e680f681448ee925864fcf16ca8fea99220b312875abbb8066054cd193b6169
Time for batch of size 7000: 10.758s
Fee paid is 2576100000
*/
async function sendAnchorTxns(count) {
  console.info(`Sending ${count} anchor extrinsics in a batch`);
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txs = [];
  const anchorIds = [];
  while (txs.length < count) {
    const anc = randomAsHex(32);
    const tx = dock.api.tx.anchor.deploy(anc);
    txs.push(tx);
    anchorIds.push(anc);
  }

  await sendBatch(dock, txs, account.address);

  return anchorIds;
}

async function runOnce() {
  let didPairs = await sendDIDTxns(3400);
  console.log('');
  didPairs = await sendKeyUpdateTxns(3300, didPairs);
  console.log('');
  await sendBlobTxns(1500, didPairs);
  console.log('');
  await sendRemoveTxns(3400, didPairs);
}

async function runInLoop(limit) {
  if (limit) {
    console.info(`Will do ${limit} iterations`);
  }
  console.time('loop');
  let count = 0;
  while (true) {
    console.time('iteration');
    console.time('WriteDID');
    const didPairs = await sendDIDTxns(3200, false);
    console.timeEnd('WriteDID');
    console.log('Added 3200 DIDs in a batch');
    console.log('');
    console.time('RemoveDID');
    await sendRemoveTxns(3200, didPairs, false);
    console.timeEnd('RemoveDID');
    console.log('Remove 3200 DIDs in a batch');
    count++;
    console.info(`Iteration ${count} done`);
    if (limit && (count >= limit)) {
      break;
    }
    console.timeEnd('iteration');
  }
  console.timeEnd('loop');
}

async function main() {
  let action = 0;
  if (process.argv.length >= 3) {
    action = parseInt(process.argv[2]);
  }
  switch (action) {
    case 0:
      await runInLoop(10);
      break;
    case 1:
      await runOnce();
      break;
    case 2:
      await fillBlock();
      break;
    case 3:
      await sendAnchorTxns(7000);
      break;
    default:
      console.error('Argument should be 0, 1 or 2');
      process.exit(1);
  }
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    main();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
