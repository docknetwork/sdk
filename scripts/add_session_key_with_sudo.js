// Script to set session key of a validator using sudo. This expects 2 arguments, the validator account address
// and its session key in hex and sends an extrinsic

import dock from '../src/api';
import { sendTxnWithAccount } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint, SudoSecretURI } = process.env;

if (process.argv.length !== 4) {
  console.error(`Need 2 arguments but provided ${process.argv.length}`);
  process.exit(2);
}

async function setSessionKeyWithSudo(validatorId, keys) {
  const txn = dock.poaModule.setSessionKey(validatorId, keys, true);
  const blockHash = await sendTxnWithAccount(dock, SudoSecretURI, txn);
  console.log(`Set session key extrinsic done in block ${blockHash}`);
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    setSessionKeyWithSudo(process.argv[2], process.argv[3]);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
