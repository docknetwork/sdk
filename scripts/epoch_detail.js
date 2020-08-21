import { encodeAddress } from '@polkadot/util-crypto';

import { DockAPI } from '../src/api';

const dock = new DockAPI();

/* const accounts = {
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY': 'Alice',
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty': 'Bob',
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y': 'Charlie'
}; */

const accounts = {
  '5DjPH6m1x4QLc4YaaxtVX752nQWZzBHZzwNhn5TztyMDgz8t': 'FT1',
  '5HR2ytqigzQdbthhWA2g5K9JQayczEPwhAfSqAwSyb8Etmqh': 'FT2',
  '5FNdWJ6RjLCJxnew1R1q4GZPjfxmdd3qCuLVPujmjozMGHzb': 'FT3',
  '5DXQL7gQWq2Y2rJqZopHiUc9knUa4MCoysTqDVRjBWBiT6gP': 'FT4',
  '5GHA4YoLXqt5MdE3Sg1B9d563tts4jqg7yKhCcv1qWfF5QHB': 'FT5',
  '5DDNFu3jhBvvWNbtK6BvrZiMUvUn6WZUyPPQTHyKD5JDWXHp': 'FT6',
  '5Ccaz1mozrwaQiqXmvwykC2FPUDDtQ51tEN2aY5KpDnuNmLN': 'FT7',
  '5FCFo59AFtZU15yFDTpJyJ74thxjySvFbAJqgut29fh6VXUk': 'FT8',
  '5D2ge4WCCoPw92GZsRntejAGZmXjasktR4xf2bdKNiGTAB2j': 'FT9',
  '5DFN9pcRFSkyEtX67uAUrpmiBWLtrRwH6bgQX9Kqm7yVDwL4': 'FT10',
};

// Take entries of map with numeric keys and sort them in ascending order of key
function sortEntriesOfMapWithNumKey(entries) {
  entries.sort((element1, element2) => element1[0]._args[0].toNumber() - element2[0]._args[0].toNumber());
}

async function printFreeBalance(name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s unlocked balance is ${balance.free.toHuman()}`);
}

async function printReservedBalance(name, account) {
  const { data: balance } = await dock.api.query.system.account(account);
  console.log(`${name}'s locked balance is ${balance.reserved.toHuman()}`);
}

async function getBlockDetails(dock, blockHash) {
  const header = await dock.api.derive.chain.getHeader(blockHash);
  console.log(`Block header is ${header}`);
  const slotNo = header.digest.logs[0].asPreRuntime[1];
  // console.log(`Slot number is ${slotNo}`);
  console.log(`Slot number is ${dock.api.createType('u64', slotNo)} and Block number is ${header.number}`);
  console.log(`Block author is ${header.author}`);
  return [dock.api.createType('u64', slotNo), header.number, header.author];
}

async function getEpochStats(dock) {
  console.log('Epochs');
  console.log('');
  const epochs = await dock.api.query.poAModule.epochs.entries();
  sortEntriesOfMapWithNumKey(epochs);
  // console.log(epochs);
  epochs.forEach(element => {
    // console.log(element[1]);
    console.log(element[0]._args[0].toNumber());
    // const epochNo = dock.api.createType('u32', element[0]);
    const epochNo = element[0].toHuman();
    console.log(`epoch no ${epochNo}`);
    const lastSlot = element[1].ending_slot.isSome ? element[1].ending_slot.unwrap().toHuman() : 'Nil';
    console.log(`No of validators: ${element[1].validator_count}, starting slot: ${element[1].starting_slot.toHuman()}, expected ending slot: ${element[1].expected_ending_slot.toHuman()}, ending slot ${lastSlot}`);
    if (element[1].total_emission.isSome) {
      const totalEmission = element[1].total_emission.unwrap().toHuman();
      const treasEmission = element[1].emission_for_treasury.unwrap().toHuman();
      const valdEmission = element[1].emission_for_validators.unwrap().toHuman();
      console.log(`Total emission: ${totalEmission}, Emission for Treasury: ${treasEmission}, Emission for validators: ${valdEmission}`);
    }
    console.log('');
    // console.log(element[1][2]);
  });
  console.log('------------------------------------------------------------------------------------------------------------');
  console.log('');
  console.log('');
}

async function getValidatorStats(dock) {
  console.log('Validator stats');
  console.log('');
  const epochBlockCounts = await dock.api.query.poAModule.validatorStats.entries();
  sortEntriesOfMapWithNumKey(epochBlockCounts);
  // console.log(epochBlockCounts);
  epochBlockCounts.forEach(element => {
    // console.log(Object.getOwnPropertyNames(element[0]));
    // console.log(element[0]._args[0]);
    // console.log(element[0].registry);
    // console.log(element[1]);
    const epochNo = element[0]._args[0];
    const validatorId = encodeAddress(element[0]._args[1]);
    console.log(`For epoch no ${epochNo}, validator ${accounts[validatorId]}, blocks authored is ${element[1].block_count}`);
    if (element[1].locked_reward.isSome) {
      const locked = element[1].locked_reward.unwrap().toHuman();
      const unlocked = element[1].unlocked_reward.unwrap().toHuman();
      console.log(`Locked rewards: ${locked}, Unlocked rewards: ${unlocked}`);
    }
    console.log('');
  });
  console.log('------------------------------------------------------------------------------------------------------------');
  console.log('');
  console.log('');
}

async function getStats(dock) {
  const emissionSupply = await dock.api.query.poAModule.emissionSupply();
  console.log(`Emission supply ${emissionSupply}`);
  console.log('-----------------------------------------------------------------------');

  await getEpochStats(dock);

  // await getValidatorStats(dock);

  for (const k in accounts) {
    await printFreeBalance(accounts[k], k);
    await printReservedBalance(accounts[k], k);
  }
}

async function main() {
  await dock.init({
    // address: 'ws://localhost:9944',
    // address: 'ws://3.128.224.235:9944',
    address: 'wss://testnet-1.dock.io',
  });
  // await getBlockDetails(dock, '0x2747e70f24d4aff7a462f2f34b7cf1b236d0167a1778c8857388f493de48928b');
  await getStats(dock);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
