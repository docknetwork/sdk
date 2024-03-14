import { randomAsHex } from '@polkadot/util-crypto';
import dock, { DockAPI } from '../src/index';
import {
  createNewDockDID, DidKeypair,
} from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { sendBatch } from './helpers';
import { DidKey, VerificationRelationship } from '../src/public-keys';

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
2000 extrinsics fail due to block limit
----
Sending 1950 DID write extrinsics in a batch
Batch size is 138459
Payment info of batch is {"weight":639111121000,"class":"Normal","partialFee":4525885851}
block 0x08f0c2dbf36e9633d7730e3c5528f2b69dcbbdd37751429999e3f0514c862e92
Time for sign and send for batch of size 1950: 4.021s
Time for send for batch of size 1950: 3.933s
Fee paid is 4525885851
*/
async function sendOnChainDIDTxns(count, waitForFinalization = true) {
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
    const didKey = new DidKey(publicKey, new VerificationRelationship());
    const tx = dock.did.createNewOnchainTx(did, [didKey], []);
    txs.push(tx);
    didPairs.push([did, new DidKeypair(pair, 1)]);
  }

  await sendBatch(dock, txs, account.address, waitForFinalization);
  return didPairs;
}

/*
Sending 1950 add keys extrinsics in a batch
Batch size is 341259
Payment info of batch is {"weight":444111121000,"class":"Normal","partialFee":5595841624}
block 0x08bd9e7ff8149a905ac041e606ef9a6b0c8849ebd32710e8330818be0a7f99e2
Time for sign and send for batch of size 1950: 2.798s
Time for send for batch of size 1950: 2.728s
Fee paid is 5595836170
*/
async function sendAddKeyTxns(count, didPairs) {
  console.info(`Sending ${count} add keys extrinsics in a batch`);
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
    const didKey = new DidKey(publicKey, new VerificationRelationship());
    const tx = await dock.did.createAddKeysTx([didKey], did, did, currentPair);
    txs.push(tx);
    j++;
  }

  await sendBatch(dock, txs, account.address);
  return didPairs;
}

/*
Sending 1950 add controller extrinsics in a batch
Batch size is 335409
Payment info of batch is {"weight":249111121000,"class":"Normal","partialFee":4579392438}
block 0x05e5c35c40eb34b2ba29482bc61e43a2d631cb465261828f5262bf890bdb0edb
Time for sign and send for batch of size 1950: 2.360s
Time for send for batch of size 1950: 2.297s
Fee paid is 4579392438
*/
async function sendAddControllerTxns(count, didPairs) {
  console.info(`Sending ${count} add controller extrinsics in a batch`);
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txs = [];
  let j = 0;
  while (txs.length < count) {
    const did = didPairs[j][0];
    const currentPair = didPairs[j][1];
    const tx = await dock.did.createAddControllersTx([createNewDockDID()], did, did, currentPair);
    txs.push(tx);
    j++;
  }

  await sendBatch(dock, txs, account.address);
  return didPairs;
}

/*
Sending 1950 DID remove extrinsics in a batch
Batch size is 271059
Payment info of batch is {"weight":249111121000,"class":"Normal","partialFee":3935805809}
block 0x1c8107b099372e0e859d6bc2b1c632e851bdf45a9c1a3a4f1d4730e8644fb028
Time for sign and send for batch of size 1950: 4.826s
Time for send for batch of size 1950: 4.776s
Fee paid is 393580275
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
    const tx = await dock.did.createRemoveTx(did, did, currentPair);
    txs.push(tx);
    j++;
  }

  await sendBatch(dock, txs, account.address, waitForFinalization);
}

/*
Sending 1500 blob write extrinsics in a batch
Batch size is 1704009
Payment info of batch is {"weight":440770321000,"class":"Normal","partialFee":19206750363}
block 0x24ece5a89ac1bce6443c3a365a0ac4cd8952c926fba382babb408cd3702a6af6
Time for sign and send for batch of size 1500: 1.543s
Time for send for batch of size 1500: 1.337s
Fee paid is 19206744950
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
    };
    const tx = await dock.blob.createNewTx(blob, did, pair, { didModule: dock.did });
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
  const count = 1000;
  let didPairs = await sendOnChainDIDTxns(count);
  console.log('');
  didPairs = await sendAddKeyTxns(count, didPairs);
  console.log('');
  await sendAddControllerTxns(count, didPairs);
  console.log('');
  await sendBlobTxns(800, didPairs);
  console.log('');
  await sendRemoveTxns(count, didPairs);
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
    const didPairs = await sendOnChainDIDTxns(1950, false);
    console.timeEnd('WriteDID');
    console.log('Added 1950 DIDs in a batch');
    console.log('');
    console.time('RemoveDID');
    await sendRemoveTxns(1950, didPairs, false);
    console.timeEnd('RemoveDID');
    console.log('Remove 1950 DIDs in a batch');
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
  .then(main)
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
