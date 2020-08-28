import { randomAsHex } from '@polkadot/util-crypto';
import dock, { DockAPI } from '../src/api';
import { createNewDockDID, createKeyDetail } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';

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


/* function customSign(nonce) {
  function sign(extrinsic, _this) {
    return extrinsic.signAsync(_this.getAccount(), { nonce });
  }
  return sign;
}

async function sendDIDTxns() {
  // const dock = new DockAPI();
  // await dock.init({
  //   address: FullNodeEndpoint,
  // });
  
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);
  // console.log(dock.api.query.system.account);
  // console.log(account);
  // console.log(dock.api.rpc.system);
  const nonce1 = (await dock.api.rpc.system.accountNextIndex(account.address)).toNumber();
  console.log(nonce1);
  const txhash1 = dock.api.tx.balances.transfer(account.address, 1);
  const nonce2 = nonce1 + 1;
  console.log(nonce2);
  const txhash2 = dock.api.tx.balances.transfer(account.address, 1);
  const nonce3 = nonce2 + 1;
  console.log(nonce3);
  dock.signAndSend(txhash1, true, {nonce: nonce1});
  dock.signAndSend(txhash2, true, {nonce: nonce2});
  const r = await dock.signAndSend(txhash2, true, {nonce: nonce3});
  console.log(r.status.asFinalized);
} */

async function sendDIDTxns(count) {
  const txs = [];
  while (txs.length < count) {
    const did = createNewDockDID();
    const seed = randomAsHex(32);
    const pair = dock.keyring.addFromUri(seed, null, 'sr25519');
    const publicKey = getPublicKeyFromKeyringPair(pair);
    const keyDetail = createKeyDetail(publicKey, did);
    const tx = dock.did.createNewTx(did, keyDetail);
    txs.push(tx);
  }
  const account = dock.keyring.addFromUri(EndowedSecretURI);
  dock.setAccount(account);

  const txBatch = dock.api.tx.utility.batch(txs);
  const r = await dock.signAndSend(txBatch, false);
  console.log(r.status.asInBlock);
}

async function main() {
  // await fillBlock();
  await sendDIDTxns(100);
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