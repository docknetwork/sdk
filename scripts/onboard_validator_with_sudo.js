// Script to onboard a new validator by setting its session key and then adding the node as a validator using sudo. This expects at least 2 arguments,
// the validator account address and its session key in hex and optionally the short circuit boolean value. This sends an extrinsic.
// This script is equivalent of running scripts `add_session_key_with_sudo` and `add_validator_with_sudo` in succession.

import dock from '../src/api';
import { sendTxnWithAccount, validatorChange } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint, SudoSecretURI } = process.env;

if (process.argv.length !== 4 && process.argv.length !== 5) {
  console.error(`Need at least 2 and at most 3 argument but provided ${process.argv.length}`);
  process.exit(2);
}

async function onboardValidator() {
  const txn = dock.poaModule.setSessionKey(process.argv[2], process.argv[3], true);
  const blockHash = await sendTxnWithAccount(dock, SudoSecretURI, txn);
  console.log(`Set session key extrinsic done in block ${blockHash}`);
  // This is an ugly shortcut to make the `validatorChange` function work by removing argument at index 3, i.e. the session key.
  process.argv.splice(3, 1);
  const blockHash1 = await validatorChange(dock, process.argv, dock.poaModule.addValidator.bind(dock.poaModule), SudoSecretURI);
  console.log(`Add validator extrinsic done in block ${blockHash1}`);
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    onboardValidator();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
