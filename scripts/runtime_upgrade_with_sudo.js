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

  console.log('Going to send node upgrade transaction');
  const blockHash = await sendTxnWithAccount(dock, SudoSecretURI, txn);
  console.log(`Code upgrade extrinsic finalized in block ${blockHash}`);
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
