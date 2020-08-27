// Script to print session keys of the current validators

import { u8aToString, bnToU8a, u8aToHex } from '@polkadot/util';
import { asDockAddress } from './helpers';
import dock from '../src/api';

require('dotenv').config();

const { FullNodeEndpoint } = process.env;

async function printSessionKeys() {
  const addresses = {};
  const keyOwners = await dock.api.query.session.keyOwner.entries();

  keyOwners.forEach((keyOwner) => {
    const addr = asDockAddress(keyOwner[1].unwrap());
    if (!(addr in addresses)) {
      addresses[addr] = {};
    }
    /* eslint no-underscore-dangle: ["error", { "allow": ["_args"] }] */
    addresses[addr][u8aToString(bnToU8a(keyOwner[0]._args[0][0]))] = u8aToHex(keyOwner[0]._args[0][1]);
  });

  Object.keys(addresses).forEach((addr) => {
    console.log(`For address ${addr}`);
    console.log(`Aura key is ${addresses[addr].aura}`);
    console.log(`Grandpa key is ${addresses[addr].gran}`);
    console.log(`Session key is ${addresses[addr].aura + addresses[addr].gran.substring(2)}`);
    console.log('');
  });
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    printSessionKeys();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
