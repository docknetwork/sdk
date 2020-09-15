// Script to add a new validator using sudo. This accepts the validator's address and optionally a short circuit argument
// which defaults to false and sends an extrinsic

import dock from '../src/api';
import { validatorChange } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint, SudoSecretURI } = process.env;

if (process.argv.length !== 3 && process.argv.length !== 4) {
  console.error(`Need at least 1 and at most 2 argument but provided ${process.argv.length}`);
  process.exit(2);
}

async function addValidator() {
  const blockHash = await validatorChange(dock, process.argv, dock.poaModule.addValidator.bind(dock.poaModule), SudoSecretURI);
  console.log(`Add validator extrinsic done in block ${blockHash}`);
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    addValidator();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
