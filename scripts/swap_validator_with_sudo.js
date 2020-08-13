// This swaps an existing validator for a new one. This accepts the old and new validator's address and sends an extrinsic

import dock from '../src/api';
import { sendTxnWithAccount } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint, SudoSecretURI } = process.env;

if (process.argv.length !== 4) {
  console.error(`Need 2 arguments but provided ${process.argv.length}`);
  process.exit(2);
}

async function swapValidator(oldValidatorId, newValidatorId) {
  const txn = dock.poaModule.swapValidator(oldValidatorId, newValidatorId, true);
  const blockHash = await sendTxnWithAccount(dock, SudoSecretURI, txn);
  console.log(`Validators swap extrinsic done in block ${blockHash}`);
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    swapValidator(process.argv[2], process.argv[3]);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
