// Get summary from for PoA like current epoch, when will it end, active validators, queued validators, etc


import dock from '../src/api';
import { asDockAddress } from './helpers';

require('dotenv').config();

const { FullNodeEndpoint } = process.env;

/**
 * Get multiple items from chain state in a single query
 * TODO: This should be moved to main code as it can be reused.
 * @param handle
 * @param queries
 * @returns {Promise<unknown>}
 */
async function multiQuery(handle, queries) {
  return new Promise((resolve, reject) => {
    try {
      handle.api.queryMulti(queries, (resp) => {
        resolve(resp);
      })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

async function getSummary(handle) {
  const [epoch,
    epochEndsAt,
    minEpochLength,
    maxActiveValidators,
    activeValidators,
    validatorsToAdd,
    validatorsToRemove,
    emissionStatus,
    emissionSupply,
  ] = await multiQuery(handle, [
    handle.api.query.poAModule.epoch,
    handle.api.query.poAModule.epochEndsAt,
    handle.api.query.poAModule.minEpochLength,
    handle.api.query.poAModule.maxActiveValidators,
    handle.api.query.poAModule.activeValidators,
    handle.api.query.poAModule.queuedValidators,
    handle.api.query.poAModule.removeValidators,
    handle.api.query.poAModule.emissionStatus,
    handle.api.query.poAModule.emissionSupply,
  ]);

  return {
    epoch: epoch.toNumber(),
    epochEndsAt: epochEndsAt.toNumber(),
    minEpochLength: minEpochLength.toNumber(),
    maxActiveValidators: maxActiveValidators.toNumber(),
    activeValidators: activeValidators.map(asDockAddress),
    validatorsToAdd: validatorsToAdd.map(asDockAddress),
    validatorsToRemove: validatorsToRemove.map(asDockAddress),
    emissionStatus,
    emissionSupply: emissionSupply.toNumber(),
  };
}

async function printSummary() {
  const summary = await getSummary(dock);
  console.log(`Current epoch is ${summary.epoch}`);
  console.log(`Current epoch ends at ${summary.epochEndsAt}`);
  console.log(`Minimum epoch length is ${summary.minEpochLength}`);
  console.log(`Maximum allowed active validators are ${summary.maxActiveValidators}`);
  console.log(`Active validator count is ${summary.activeValidators.length}`);
  console.log(`Active validator list is ${summary.activeValidators}`);
  if (summary.validatorsToAdd.length > 0) {
    console.log(`List of validators to add in next epoch ${summary.validatorsToAdd}`);
  } else {
    console.log('No validators in queue to add');
  }
  if (summary.validatorsToRemove.length > 0) {
    console.log(`List of validators to remove in next epoch ${summary.validatorsToRemove}`);
  } else {
    console.log('No validators to remove');
  }
  console.log(summary.emissionStatus);
  console.log(summary.emissionSupply);
  process.exit(0);
}

dock.init({
  address: FullNodeEndpoint,
})
  .then(() => {
    printSummary();
  })
  .catch((error) => {
    console.error('Error occurred somewhere, it was caught!', error);
    process.exit(1);
  });
