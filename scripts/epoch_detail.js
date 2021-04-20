import axios from 'axios';

import { DockAPI } from '../src/api';
import { asDockAddress } from '../src/utils/codec';

require('dotenv').config();

const { FullNodeEndpoint, Network } = process.env;

const dock = new DockAPI();

let accounts;

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

async function printEpochStats() {
  console.log('Epochs');
  console.log('');
  const epochs = await dock.api.query.poAModule.epochs.entries();
  sortEntriesOfMapWithNumKey(epochs);
  epochs.forEach((element) => {
    console.log(element[0]._args[0].toNumber());
    const epochNo = element[0].toHuman();
    console.log(`epoch no ${epochNo}`);
    const lastSlot = element[1].ending_slot.isSome ? element[1].ending_slot.unwrap().toHuman() : 'Nil';
    console.log(`No of validators: ${element[1].validator_count}, starting slot: ${element[1].starting_slot.toHuman()}, expected ending slot: ${element[1].expected_ending_slot.toHuman()}, ending slot ${lastSlot}`);
    if (element[1].emission_for_treasury.isSome) {
      const treasEmission = element[1].emission_for_treasury.unwrap().toHuman();
      const valdEmission = element[1].emission_for_validators.unwrap().toHuman();
      console.log(`Emission for Treasury: ${treasEmission}, Emission for validators: ${valdEmission}`);
    }
    console.log('');
  });
  console.log('------------------------------------------------------------------------------------------------------------');
  console.log('');
}

async function printValidatorStats() {
  console.log('Validator stats');
  console.log('');
  const epochBlockCounts = await dock.api.query.poAModule.validatorStats.entries();
  sortEntriesOfMapWithNumKey(epochBlockCounts);
  epochBlockCounts.forEach((element) => {
    const epochNo = element[0]._args[0];
    const validatorId = asDockAddress(element[0]._args[1], Network);
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
}

async function printRemainingSupply() {
  const emissionSupply = await dock.api.query.poAModule.emissionSupply();
  console.log(`Remaining emission supply ${emissionSupply}`);
  console.log('-----------------------------------------------------------------------');
  console.log('');
  // The treasury always has this address
  const expectedTreasuryAddress = '5EYCAe5d818kja8P5YikNggRz4KxztMtMhxP6qSTw7Bwahwq';
  const ta = await dock.api.rpc.poa.treasuryAccount();
  if (asDockAddress(ta, Network) !== expectedTreasuryAddress) {
    console.error(`Treasury address is not ${expectedTreasuryAddress}. This should not be the case`);
  }
  const tb = await dock.api.rpc.poa.treasuryBalance();
  console.log(`Treasury balance is ${tb}`);
  console.log('-----------------------------------------------------------------------');
  console.log('');
}

async function printValidatorBal() {
  /* eslint-disable no-await-in-loop */
  for (const k in accounts) {
    console.log(`${accounts[k]}'s address is ${k}`);
    await printFreeBalance(accounts[k], k);
    await printReservedBalance(accounts[k], k);
  }
  /* eslint-disable no-await-in-loop */
}

async function main() {
  await dock.init({
    address: FullNodeEndpoint,
  });
  accounts = (await axios.get('https://gist.github.com/lovesh/c540b975774735fe0001c86fa47a91b3/raw')).data;
  let action = 0;
  if (process.argv.length >= 3) {
    action = parseInt(process.argv[2]);
  }
  switch (action) {
    case 0:
      await printRemainingSupply();
      break;
    case 1:
      await printValidatorBal();
      break;
    case 2:
      await printEpochStats();
      break;
    case 3:
      await printValidatorStats();
      break;
    default:
      console.error('Argument should be 0, 1, 2 or 3');
      process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
