import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { createSignedKeyUpdate } from '../src/utils/did';
import { getPublicKeyFromKeyringPair } from '../src/utils/misc';
import { DockAPI, PublicKeySr25519 } from '../src/api';
import b58 from 'bs58';

/// This script is not configurable via command line. You will need to maually edit `main()`
/// to input your own values.
///
/// Use (with node running locally):
///
/// ```bash
/// cd sdk
/// yarn
/// npx babel-node ./scripts/change_did_key.js
/// ```

(async () => {
  await main();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  /// This did is preregistered for local development chains.
  const ALICE_DID = '0x416c696365000000000000000000000000000000000000000000000000000000';
  /// The default keypair for "Alice\0\0\0..." on local developnent chains.
  const ALICE_KP = {
    sk: '0x416c696365736b00000000000000000000000000000000000000000000000000',
    pk: '0xb8b868f83227df83240fdbefcaa2636bebf16304c9249069897b510b7d8bbd0b',
  };
  /// Some arbitray sr25519 keypair.
  const TEST_KP = {
    sk: '0x6b9abb2153e0e3989bb53869b4a88806941a0a86cefa08a7977aff73379df734',
    pk: '0xc081a33d27d66ceda4e9f634f2f3a1b3b7f4ad898662036416250862ffae623f',
  };

  // set key to TEST_KP
  await updateDIDKey({
    nodeWsUrl: 'ws://localhost:9944',
    did: ALICE_DID,
    currentSk: ALICE_KP.sk,
    newPk: TEST_KP.pk,
    payerSk: "//Bob"
  });

  // set it back to the default
  await updateDIDKey({
    nodeWsUrl: 'ws://localhost:9944',
    did: ALICE_DID,
    currentSk: TEST_KP.sk,
    newPk: ALICE_KP.pk,
    payerSk: "//Bob"
  });
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

  // when this script was written there was a bug that would cause the sript to block forever when
  // this line was uncommented.
  // await dock.disconnect();
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
