// Script to send runtime upgrade using sudo account

import dock from '../src/api';
import { sendTxnWithAccount } from './helpers';

require('dotenv').config();

const fs = require('fs');

const { FullNodeEndpoint, SudoSecretURI } = process.env;

if (process.argv.length !== 3) {
  console.error('Need only 1 argument which is the path of wasm file');
  process.exit(2);
}

/**
 * Returns an array of Authoring version, Spec version, Impl version and Transaction version
 * @param {*} dock 
 */
async function getRuntimeVersion(dock) {
  const ver = await dock.api.rpc.state.getRuntimeVersion();
  return [ver.authoringVersion.toNumber(), ver.specVersion.toNumber(), ver.implVersion.toNumber(), ver.transactionVersion.toNumber()];
}

async function doRuntimeUpgrade() {
  const code = fs.readFileSync(process.argv[2]);
  const codeAsHex = code.toString('hex');
  // Prepare to send the code
  const proposal = dock.api.tx.system.setCode(`0x${codeAsHex}`);

  // The code will be much bigger than whats allowed in a block and thus using only `sudo.sudo`
  // will result in "Invalid Transaction" due to block limit being hit. Thus using `sudo.sudoUncheckedWeight` and
  // passing weight same as byte size of code.
  // XXX: This is accurate as of now as the chain considers a weight of 1 unit for 1 byte but not universal. It will be
  // more accurate to get those constants from chain and then compute weight. Passing on that sudo will be removed soon.
  const txn = dock.api.tx.sudo.sudoUncheckedWeight(proposal, code.length);

  const runtimeVerBeforeUpgrade = await getRuntimeVersion(dock);
  console.log('Before upgrade');
  console.log(`Authoring version, Spec version, Impl version, Transaction version -> (${[...runtimeVerBeforeUpgrade]})`);

  console.log('Going to send node upgrade transaction');
  const blockHash = await sendTxnWithAccount(dock, SudoSecretURI, txn);
  console.log(`Code upgrade extrinsic finalized in block ${blockHash}`);

  const runtimeVerAfterUpgrade = await getRuntimeVersion(dock);
  console.log('After upgrade');
  console.log(`Authoring version, Spec version, Impl version, Transaction version -> (${[...runtimeVerAfterUpgrade]})`);

  // Runtime version should change.
  if (JSON.stringify(runtimeVerBeforeUpgrade) === JSON.stringify(runtimeVerAfterUpgrade)) {
    throw new Error('Runtime version did not change post upgrade. Update did not happen, maybe the node was already running the version');
  }
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    doRuntimeUpgrade();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
