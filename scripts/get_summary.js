// Get summary from for PoA like current epoch, when will it end, active validators, queued validators, etc
import { bnToBn } from '@polkadot/util';
import dock from '../src/index';

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
  const [
    emissionStatus,
    emissionSupply,
    totalIssuance,
  ] = await multiQuery(handle, [
    handle.api.query.stakingRewards.stakingEmissionStatus,
    handle.api.query.stakingRewards.stakingEmissionSupply,
    handle.api.query.balances.totalIssuance,
  ]);

  // const accounts = await dock.api.query.system.account.entries();
  // const totalBal = bnToBn(0);
  // accounts.forEach((entry) => {
  //   totalBal.iadd(entry[1].data.free);
  //   totalBal.iadd(entry[1].data.reserved);
  // });
  return {
    emissionStatus,
    emissionSupply: emissionSupply.toString(),
    totalIssuance: totalIssuance.toString(),
    // totalBal: totalBal.toString(),
  };
}

async function printSummary() {
  const summary = await getSummary(dock);
  console.log(`Emission status is ${summary.emissionStatus.toJSON()}`);
  console.log(`Emission supply is ${summary.emissionSupply}`);
  console.log(`Total issuance is ${summary.totalIssuance}`);
  // console.log(`Total balance is ${summary.totalBal}`);
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
