import { Keyring } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a } from '@polkadot/util-crypto';
import { assert, u8aToHex, stringToU8a } from '@polkadot/util';
import {
  FullNodeEndpoint,
  TestAccountURI,
  TestKeyringOpts,
} from '../test-constants';
import { DockAPI } from '../../src';
import {
  getSignatureFromKeyringPair,
  getStateChange,
} from '../../src/utils/misc';
import { createDidSig } from '../../src/did';

const ALICE_DID = u8aToHex(
  stringToU8a('Alice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'),
);
const BOB_DID = u8aToHex(
  stringToU8a('Bob\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'),
);
const CHARLIE_DID = u8aToHex(
  stringToU8a('Charlie\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'),
);
const ALICE_SK = u8aToHex(
  stringToU8a('Alicesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'),
);
const BOB_SK = u8aToHex(
  stringToU8a('Bobsk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'),
);
const CHARLIE_SK = u8aToHex(
  stringToU8a('Charliesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'),
);

describe.skip('Master Module', () => {
  // node client
  let nc;
  let systemModule;
  let sudoModule;
  let masterModule;
  let masterQuery;

  beforeAll(async () => {
    nc = await connect();
    systemModule = nc.api.tx.system;
    sudoModule = nc.api.tx.sudo;
    masterModule = nc.api.tx.master;
    masterQuery = nc.api.query.master;
  }, 40000);

  afterAll(async () => {
    await nc.disconnect();
  }, 10000);

  async function getStorage(key) {
    return nc.api.rpc.state.getStorage(key);
  }

  test('control: set and get bytes as sudo', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const sudocall = sudoModule.sudo(systemModule.setStorage([[key, val]]));
    await signSendTx(sudocall);
    const bs = (await getStorage(key)).unwrap();
    expect(u8aToHex(bs)).toEqual(val);
  }, 20000);

  test('Root call with no votes', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    await masterSetStorage(nc, systemModule, masterModule, key, val, []);
    const sto = await getStorage(key);
    assert(sto.isNone, 'storage item should not have been set');
  }, 20000);

  test('Root call with invalid votes', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(u8aToHex(randomAsU8a(32)))],
      [CHARLIE_DID, await keypair(u8aToHex(randomAsU8a(32)))],
    ];
    await masterSetStorage(
      nc,
      systemModule,
      masterModule,
      key,
      val,
      did_to_key,
    );
    const sto = await getStorage(key);
    assert(sto.isNone, 'storage item should not have been set');
  }, 20000);

  test('Root call with valid votes', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await masterSetStorage(
      nc,
      systemModule,
      masterModule,
      key,
      val,
      did_to_key,
    );
    const sto = await getStorage(key);
    const u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with valid votes but insufficient vote count', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [[ALICE_DID, await keypair(ALICE_SK)]];
    await masterSetStorage(
      nc,
      systemModule,
      masterModule,
      key,
      val,
      did_to_key,
    );
    const sto = await getStorage(key);
    assert(sto.isNone, 'storage item should not have been set');
  }, 20000);

  test('Root call with valid votes and oversufficient vote count', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [BOB_DID, await keypair(BOB_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await masterSetStorage(
      nc,
      systemModule,
      masterModule,
      key,
      val,
      did_to_key,
    );
    const sto = await getStorage(key);
    const u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with votes not sorted lexically', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [BOB_DID, await keypair(BOB_SK)],
      [ALICE_DID, await keypair(ALICE_SK)],
    ];
    await masterSetStorage(
      nc,
      systemModule,
      masterModule,
      key,
      val,
      did_to_key,
    );
    const sto = await getStorage(key);
    const u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Use a master call to modify master membership.', async () => {
    const fourth_did = u8aToHex(randomAsU8a(32));
    const newMembership = nc.api.createType('Membership', {
      members: sortedSet([ALICE_DID, BOB_DID, CHARLIE_DID, fourth_did]),
      voteRequirement: 2,
    });

    // master members are not yet set
    expect((await masterQuery.members()).toU8a()).not.toEqual(
      newMembership.toU8a(),
    );

    const call = masterModule.setMembers(newMembership);
    const votes = await allVote(nc, call, [
      [BOB_DID, await keypair(BOB_SK)],
      [ALICE_DID, await keypair(ALICE_SK)],
    ]);
    await signSendTx(masterModule.execute(call, votes));

    // master members were set
    expect((await masterQuery.members()).toU8a()).toEqual(
      newMembership.toU8a(),
    );
  }, 20000);
});

// connect to running node
async function connect() {
  const dock = new DockAPI();
  await dock.init({
    keyring: TestKeyringOpts,
    address: FullNodeEndpoint,
  });
  return dock;
}

// Load a sr25519 keypair from secret, secret may be "0x" prefixed hex seed
// or seed phrase or "//DevKey/Derivation/Path".
async function keypair(seed) {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  return keyring.addFromUri(seed);
}

/// sign extrinsic as test account, submit it and wait for it to finalize
async function signSendTx(extrinsic) {
  const key = await keypair(TestAccountURI); // getTestAccountKey();
  await extrinsic.signAsync(key);

  return new Promise((resolve, reject) => {
    try {
      let unsubFunc = null;
      return extrinsic
        .send(({ events = [], status }) => {
          if (status.isInBlock) {
            unsubFunc();
            resolve({
              events,
              status,
            });
          }
        })
        .catch((error) => {
          reject(error);
        })
        .then((unsub) => {
          unsubFunc = unsub;
        });
    } catch (error) {
      reject(error);
    }

    return this;
  });
}

async function masterSetStorage(
  nc, // node client
  systemModule,
  masterModule,
  key, // hex encoded bytes
  val, // hex encoded bytes
  did_to_key, // list of [did, key] pairs with which to vote. dids are hex encoded
) {
  assert(key.startsWith('0x'), 'should prefixed with 0x');
  assert(val.startsWith('0x'), 'should prefixed with 0x');

  const call = systemModule.setStorage([[key, val]]); // this is a root-only extrinsic
  const votes = await allVote(nc, call, did_to_key);
  await signSendTx(masterModule.execute(call, votes));
}

/// lexically sorted set of elements.
function sortedSet(list) {
  const ret = new Set();
  for (const s of list) {
    ret.add(s);
  }
  const sorted = [...ret];
  sorted.sort();
  return sorted;
}

/// helper func
/// sign the call as a StateChange::MasterVote using all provided [did, key] pairs
/// return the complete proof of master authorization as the on-chain "PMAuth" type
/// the votes are sorted as lexically as the chain expects
async function allVote(
  nc, // node client
  proposal, // the extrinsic to be run as root
  did_to_key, // list of [did, key] pairs with which to vote. dids are hex encoded
) {
  for (const [did, _key] of did_to_key) {
    assert(did.startsWith('0x'), 'should prefixed with 0x');
    assert(did.length === 66, 'should be 32 bytes');
  }

  const encodedProposal = [...nc.api.createType('Call', proposal).toU8a()];
  const roundNo = await nc.api.query.master.round();

  const votes = [];
  for (const [did, key] of did_to_key) {
    const nonce = await nc.didModule.getNextNonceForDid(DockDid.from(did));
    const vote = { nonce, data: { proposal: encodedProposal, roundNo } };
    const encodedStateChange = getStateChange(nc.api, 'MasterVote', vote);
    const signature = getSignatureFromKeyringPair(key, encodedStateChange);
    const didSig = createDidSig(DockDid.from(did), 1, signature);
    votes.push({ sig: didSig, nonce });
  }
  return votes;
}
