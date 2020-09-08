import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a } from '@polkadot/util-crypto';
import { assert, u8aToHex, stringToU8a } from '@polkadot/util';
import { FullNodeEndpoint, TestAccountURI } from '../test-constants';
import types from '../../src/types.json';

const ALICE_DID = u8aToHex(stringToU8a('Alice\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));
const BOB_DID = u8aToHex(stringToU8a('Bob\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));
const CHARLIE_DID = u8aToHex(stringToU8a('Charlie\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));
const ALICE_SK = u8aToHex(stringToU8a('Alicesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));
const BOB_SK = u8aToHex(stringToU8a('Bobsk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));
const CHARLIE_SK = u8aToHex(stringToU8a('Charliesk\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0'));

describe('Master Module', () => {
  // node client
  let nc;

  beforeAll(async (done) => {
    nc = await connect();
    done();
  }, 40000);

  afterAll(async () => { await nc.disconnect(); }, 10000);

  test('control: set and get bytes as sudo', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const sudocall = nc.tx.sudo.sudo(nc.tx.system.setStorage([[key, val]]));
    await signSendTx(sudocall);
    const bs = (await nc.rpc.state.getStorage(key)).unwrap();
    expect(u8aToHex(bs)).toEqual(val);
  }, 20000);

  test('Root call with no votes', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    await masterSetStorage(nc, key, val, []);
    const sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, 'storage item should not have been set');
  }, 20000);

  test('Root call with invalid votes', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(u8aToHex(randomAsU8a(32)))],
      [CHARLIE_DID, await keypair(u8aToHex(randomAsU8a(32)))],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    const sto = await nc.rpc.state.getStorage(key);
    assert(sto.isNone, 'storage item should not have been set');
  }, 20000);

  test('Root call with valid votes', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
      [CHARLIE_DID, await keypair(CHARLIE_SK)],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    const sto = await nc.rpc.state.getStorage(key);
    const u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Root call with valid votes but insufficient vote count', async () => {
    const key = u8aToHex(randomAsU8a(32));
    const val = u8aToHex(randomAsU8a(32));
    const did_to_key = [
      [ALICE_DID, await keypair(ALICE_SK)],
    ];
    await masterSetStorage(nc, key, val, did_to_key);
    const sto = await nc.rpc.state.getStorage(key);
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
    await masterSetStorage(nc, key, val, did_to_key);
    const sto = await nc.rpc.state.getStorage(key);
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
    await masterSetStorage(nc, key, val, did_to_key);
    const sto = await nc.rpc.state.getStorage(key);
    const u8a = sto.unwrap();
    expect(u8aToHex(u8a)).toEqual(val);
  }, 20000);

  test('Use a master call to modify master membership.', async () => {
    const fourth_did = u8aToHex(randomAsU8a(32));
    const new_membership = nc.createType('Membership', {
      members: sortedSet([
        ALICE_DID,
        BOB_DID,
        CHARLIE_DID,
        fourth_did,
      ]),
      vote_requirement: 2,
    });

    // master members are not yet set
    expect((await nc.query.master.members()).toU8a())
      .not
      .toEqual(new_membership.toU8a());

    const call = nc.tx.master.setMembers(new_membership);
    const votes = await allVote(
      nc,
      call,
      [
        [BOB_DID, await keypair(BOB_SK)],
        [ALICE_DID, await keypair(ALICE_SK)],
      ],
    );
    await signSendTx(nc.tx.master.execute(call, votes));

    // master members were set
    expect((await nc.query.master.members()).toU8a())
      .toEqual(new_membership.toU8a());
  }, 20000);
});

// connect to running node
async function connect() {
  return await ApiPromise.create({
    provider: new WsProvider(FullNodeEndpoint),
    types,
  });
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

  const promise = new Promise((resolve, reject) => {
    try {
      let unsubFunc = null;
      return extrinsic.send(({ events = [], status }) => {
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

  return await promise;
}

async function masterSetStorage(
  nc, // node client
  key, // hex encoded bytes
  val, // hex encoded bytes
  did_to_key, // list of [did, key] pairs with which to vote. dids are hex encoded
) {
  assert(key.startsWith('0x'), 'should prefixed with 0x');
  assert(val.startsWith('0x'), 'should prefixed with 0x');

  const call = nc.tx.system.setStorage([[key, val]]); // this is a root-only extrinsic
  const votes = await allVote(nc, call, did_to_key);
  await signSendTx(nc.tx.master.execute(call, votes));
}

/// lexically sorted set of elements.
function sortedSet(list) {
  const sorted = [...list];
  sorted.sort();
  const ret = new Set();
  for (const s of sorted) {
    ret.add(s);
  }
  return ret;
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
  const payload = {
    proposal: [...nc.createType('Call', proposal).toU8a()],
    round_no: await nc.query.master.round(),
  };
  const encoded_state_change = nc.createType('StateChange', { MasterVote: payload }).toU8a();

  const dtk_sorted = [...did_to_key];
  dtk_sorted.sort(); // this relies on dids being hex encoded

  const votes = new Map();
  for (const [did, key] of dtk_sorted) {
    votes.set(did, { Sr25519: key.sign(encoded_state_change) });
  }
  return votes;
}
