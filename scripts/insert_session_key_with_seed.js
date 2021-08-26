// Script to insert new session key in keystore. This will accept a seed, generate Aura (sr25519) and Grandpa (ed25519) keys
// using the same seed and insert them in the keystore. This is useful when an entity needs to run several nodes as validators
// by all nodes having the same session key in their keystore but only one of them running as a validator (with flag `--validator`)

import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import dock from '../src/index';

require('dotenv').config();

// This is the endpoint of the node whose keystore will be updated with the keys
const { FullNodeEndpoint } = process.env;

if (process.argv.length !== 3) {
  console.error('Need only one argument as the seed');
  process.exit(1);
}

/**
 * Generate Babe, Grandpa, Authority discovery and Imonline keys using the given seed
 * @param seed Can be 32 byte hex or phrase (list of words)
 * @returns {Promise<void>}
 */
async function insertKeys(seed) {
  await cryptoWaitReady();
  const pairBabe = dock.keyring.addFromUri(seed, null, 'sr25519');
  const pkBabe = u8aToHex(pairBabe.publicKey);
  const pairGran = dock.keyring.addFromUri(seed, null, 'ed25519');
  const pkGran = u8aToHex(pairGran.publicKey);
  const pairAudi = dock.keyring.addFromUri(seed, null, 'sr25519');
  const pkAudi = u8aToHex(pairAudi.publicKey);
  const pairImon = dock.keyring.addFromUri(seed, null, 'sr25519');
  const pkImon = u8aToHex(pairImon.publicKey);

  // Prepare session key by concatenating Aura and Grandpa keys
  const sessKey = pkBabe + pkGran.substring(2) + pkAudi.substring(2) + pkImon.substring(2); // Remove `0x` from other key

  // Insert keys through RPC
  await dock.api.rpc.author.insertKey('babe', seed, pkBabe);
  await dock.api.rpc.author.insertKey('gran', seed, pkGran);
  await dock.api.rpc.author.insertKey('audi', seed, pkAudi);
  await dock.api.rpc.author.insertKey('imon', seed, pkImon);

  const hasKey = await dock.api.rpc.author.hasSessionKeys(sessKey);
  if (!hasKey) {
    throw new Error('Inserted session key not found in keystore. This is a bug and should be reported');
  }
  console.log(`The generated session key is ${sessKey}`);
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => insertKeys(process.argv[2]))
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
