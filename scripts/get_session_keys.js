// Script to print session keys of the current validators

import { u8aToString, bnToU8a, u8aToHex } from '@polkadot/util';
import { asDockAddress } from '../src/utils/codec';
import dock from '../src/index';

require('dotenv').config();

const { FullNodeEndpoint, Network } = process.env;

async function printSessionKeys() {
  const addresses = {};
  const keyOwners = await dock.api.query.session.keyOwner.entries();

  keyOwners.forEach((keyOwner) => {
    const addr = asDockAddress(keyOwner[1].unwrap(), Network);
    if (!(addr in addresses)) {
      addresses[addr] = {};
    }
    /* eslint no-underscore-dangle: ["error", { "allow": ["_args"] }] */
    addresses[addr][u8aToString(bnToU8a(keyOwner[0]._args[0][0]))] = u8aToHex(keyOwner[0]._args[0][1]);
  });

  console.log(`Found ${Object.keys(addresses).length} addreses`);
  console.log();

  Object.keys(addresses).forEach((addr) => {
    console.log(`For address ${addr}`);
    console.log(`Babe key is ${addresses[addr].babe}`);
    console.log(`Grandpa key is ${addresses[addr].gran}`);
    console.log(`Authority Discovery key is ${addresses[addr].audi}`);
    console.log(`Imonline key is ${addresses[addr].imon}`);
    console.log(`Session key is ${addresses[addr].babe + addresses[addr].gran.substring(2) + addresses[addr].audi.substring(2) + addresses[addr].imon.substring(2)}`);
    console.log('');
  });
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(printSessionKeys)
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
