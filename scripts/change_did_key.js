/// This script assumes that all keys are sr25519.
///
/// Warning: This script only supports sr25519 keys. Do not use it to set an non-sr25519 public key.
///          If you do, you will lose control of your DID.

import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex, assert } from '@polkadot/util';
import { createSignedKeyUpdate, getHexIdentifierFromDID } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { DockAPI, PublicKeySr25519 } from '../src/api';
import b58 from 'bs58';

require('dotenv').config();

/// Use (with node running locally):
///
/// ```bash
/// cd sdk
/// yarn
/// npx babel-node ./scripts/change_did_key.js args..
/// ```

const USAGE = `\
npx babel-node ./scripts/change_did_key.js <did> <new_pk>
  where
    <did> either a fully qualified dock did (did:dock:..) or a 32 byte hex string.
    <new_pk> is a 32 byte, 0x prefixed hex string.

env vars:
  - FullNodeEndpoint: websocket Url of a trusted node
  - DidHolderSecret:  current secret key of the did. provided as a substrate secret URI
  - PayerSecret:      secret key to the on-chain account that will submit the transaction
                      this account pays transaction fees. provided as a substrate secret URI

Warning: This script only supports sr25519 keys. Do not use it to set an non-sr25519 public key.
         If you do, you will lose control of your DID.

examples:
- npx babel-node ./scripts/change_did_key.js 0x416c696365000000000000000000000000000000000000000000000000000000 0xb8b868f83227df83240fdbefcaa2636bebf16304c9249069897b510b7d8bbd0b
- npx babel-node ./scripts/change_did_key.js did:dock:5DYVB5ouXwTKXwMJvKZP49Tv5RFUhJ2i6i4GXou6LpPQDtEL 0xb8b868f83227df83240fdbefcaa2636bebf16304c9249069897b510b7d8bbd0b
`;

(async () => {
  await main();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  const {
    FullNodeEndpoint,
    DidHolderSecret,
    PayerSecret,
  } = process.env;
  assert(FullNodeEndpoint !== undefined, "env var FullNodeEndpoint must be defined");
  assert(DidHolderSecret !== undefined, "env var DidHolderSecret must be defined");
  assert(PayerSecret !== undefined, "env var PayerSecret must be defined");

  if (process.argv.length !== 4) {
    throw USAGE;
  }
  const [_, __, did_arg, new_pk] = process.argv;
  const did = getHexIdentifierFromDID(did_arg);
  assertHex32(did);
  assertHex32(new_pk);

  await updateDIDKey({
    nodeWsUrl: FullNodeEndpoint,
    did,
    currentSk: DidHolderSecret,
    newPk: new_pk,
    payerSk: PayerSecret,
  });

  console.log(`Public key for did ${did_arg} successfully updated to ${new_pk}.`)
}

// This function assumes all keys are sr25519.
async function updateDIDKey({ nodeWsUrl, did, currentSk, newPk, payerSk }) {
  const dock = new DockAPI();
  await dock.init({ address: nodeWsUrl });
  dock.setAccount(await keypair(payerSk));

  const currentPair = await keypair(currentSk);
  const currentPk = getPublicKeyFromKeyringPair(currentPair).value;

  // check
  let initialPk = await getSr25519PkHex(dock, did);
  assert_equal(initialPk, currentPk, "provided secret key does not control this did");

  const [keyUpdate, signature] = await createSignedKeyUpdate(
    dock.did,
    did,
    new PublicKeySr25519(newPk),
    currentPair,
    undefined // we are not updating the controller
  );

  await dock.did.updateKey(keyUpdate, signature);

  // check
  const finalPk = await getSr25519PkHex(dock, did);
  assert_equal(finalPk, newPk, "paid transaction did not take effect, something went wrong");

  await dock.disconnect();
}

// Load a sr25519 keypair from secret, secret may be "0x" prefixed hex seed
// or seed phrase or "//DevKey/Derivation/Path".
async function keypair(seed) {
  await cryptoWaitReady();
  let keyring = new Keyring({ type: 'sr25519' });
  let key = keyring.addFromUri(seed);
  return key
}

function assert_equal(a, b, note = 'equality assertion false') {
  if (a !== b) {
    throw `${note}\n${a} !== ${b}`;
  }
}

async function getSr25519PkHex(dock, did) {
  const doc = await dock.did.getDocument(did);
  const pk = doc.publicKey[0];
  assert_equal(pk.type, 'Sr25519VerificationKey2020', "this script assumes sr25519");
  return u8aToHex(b58.decode(pk.publicKeyBase58));
}

function assertHex32(v) {
  if (!isHex32(v)) {
    throw `"${v}" is not valid as a 32 byte lowecase 0x-prefixed hex-string`;
  }
}

function isHex32(v) {
  if ((typeof v) !== 'string') {
    throw "bad type passed to isHex32";
  }
  if (!v.startsWith("0x")) {
    return false;
  }
  for (let c of v.slice(2)) {
    if (!"0123456789abcdef".includes(c)) {
      return false;
    }
  }
  if (v.length !== 66) {
    return false;
  }
  return true;
}
