import BN from "bn.js";
import { from, lastValueFrom, of, timer, Observable, EMPTY } from "rxjs";
import {
  tap,
  map as mapRx,
  filter as filterRx,
  mergeMap,
  switchMap,
  toArray,
  concatMapTo,
  catchError,
} from "rxjs/operators";
import {
  prop,
  indexBy,
  defaultTo,
  reject,
  pluck,
  assoc,
  chain,
  toPairs,
  keys,
  map,
  isEmpty,
  differenceWith,
  pipe,
  curry,
  o,
  values,
  __,
  complement,
  split,
  reduceBy,
} from "ramda";

import dock from "../src";
import { sendAlarmEmail } from "./email_utils";
import {
  batchExtrinsics,
  envObj,
  notNilAnd,
  rejectTimeout,
  finiteNumber,
} from "./helpers";

require("dotenv").config();

const {
  StakingPayoutsAlarmEmailTo,
  InitiatorAccountURI,
  BatchSize,
  ConcurrentRequestsLimit,
  RetryTimeout,
  ConcurrentTxLimit,
  MaxCommission,
  FullNodeEndpoint,
  AlarmBalance,
  TxFinalizationTimeout,
  IterationTimeout,
} = envObj({
  // List of email addresses separated by comma to send alarm email to.
  StakingPayoutsAlarmEmailTo: notNilAnd(split(",")),
  // Account to send transactions from.
  InitiatorAccountURI: notNilAnd(String),
  // Max batch size.
  BatchSize: o(finiteNumber, defaultTo(5)),
  // Max amount of concurrent requests.
  ConcurrentRequestsLimit: o(finiteNumber, defaultTo(10)),
  // Max amount of concurrent transactions.
  ConcurrentTxLimit: o(finiteNumber, defaultTo(5)),
  // Timeout to wait before retry transaction.
  RetryTimeout: o(finiteNumber, defaultTo(5e3)),
  // Max commission allowed to be set for validators. Default to 5%.
  MaxCommission: o((val) => new BN(val), defaultTo("50000000")),
  // Address of the node RPC.
  FullNodeEndpoint: notNilAnd(String),
  // Account balance to ring alarm.
  AlarmBalance: notNilAnd((val) => new BN(val)),
  // Time to wait for transaction to be finalized.
  TxFinalizationTimeout: o(finiteNumber, defaultTo(2e5)),
  // Time to wait for all payments to be sent before returning with an error.
  IterationTimeout: o(finiteNumber, defaultTo(4e5)),
});

Promise.race([
  (async function main() {
    console.log("Initializing...");
    await dock.init({
      address: FullNodeEndpoint,
    });

    const txSender = dock.keyring.addFromUri(InitiatorAccountURI);
    dock.setAccount(txSender);

    console.log("Pre-work balance check.");
    await checkBalance(
      dock.api,
      StakingPayoutsAlarmEmailTo,
      txSender.address,
      AlarmBalance
    );

    console.log("Calculating and sending payouts:");
    await sendStakingPayouts(dock.api, txSender);

    console.log("Post-work balance check.");
    await checkBalance(
      dock.api,
      StakingPayoutsAlarmEmailTo,
      txSender.address,
      AlarmBalance
    );

    console.log(`Done!`);
  })(),
  rejectTimeout(IterationTimeout),
])
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit());

/**
 * Sends staking payouts for recent eras using the given sender account.
 *
 * @param {*} api
 * @param {*} txSender - account to send tx from
 */
async function sendStakingPayouts(api, txSender) {
  console.log("- Fetching eras info...");
  const erasInfo = await fetchErasInfo(api);

  const validators = pipe(
    values,
    pluck("validators"),
    chain(keys),
    (values) => new Set(values)
  )(erasInfo.pointsByEra);

  if (!validators.size) {
    console.log("- Validator set is empty.");
    return;
  }

  const erasToBePaid = await lastValueFrom(
    getUnclaimedStashesEras(api, erasInfo, validators).pipe(toArray())
  );

  const rewards = pipe(buildValidatorRewards, toPairs)(erasInfo, erasToBePaid);

  if (isEmpty(rewards)) {
    console.log("- No unpaid validator rewards found for recent eras.");
    return;
  }

  console.log("- Payments need to be made:");

  for (const [stashId, eras] of rewards) {
    console.log(
      ` * To \`${stashId}\`: ${eras.reduce(
        ({ reward: a }, { reward: b }) => (a != null ? a.add(b) : b),
        { reward: null }
      )}`
    );
  }

  const payoutTxs$ = from(rewards).pipe(
    mergeMap(([stashId, eras]) => from(eras.map(assoc("stashId", stashId)))),
    mapRx(({ stashId, era }) => api.tx.staking.payoutStakers(stashId, era)),
    batchExtrinsics(api, BatchSize),
    signAndSendExtrinsics(api, txSender)
  );

  await new Promise((resolve, reject) =>
    payoutTxs$
      .pipe(
        tap(({ result, tx }) => {
          console.log(
            ` * Batch transaction finalized at block \`${result.status.asFinalized}\`: [`
          );
          for (const arg of tx.method.args[0]) {
            console.log(
              `   \`${arg.get("args").validator_stash}\` rewarded for era ${
                arg.get("args").era
              }`
            );
          }
          console.log(" ]");
        })
      )
      .subscribe({
        error: reject,
        complete: resolve,
      })
  );
}

/**
 * Checks balance of the given account.
 * In case it's lower than the minimum value, will send an alarm email.
 *
 * @param {*} api
 * @param {string} toAddr - address to send email to
 * @param {*} txSender - account to check balance of
 * @param {BN} min - minimum balance to ring alarm
 */
async function checkBalance(api, toAddr, address, min) {
  const {
    data: { free: balance },
  } = await api.query.system.account(address);

  if (balance.lt(min)) {
    console.error(
      `Balance of the \`${address}\` - ${balance} is less than ${min}.`
    );

    await sendAlarmEmail(
      toAddr,
      "Low balance of the staking payouts sender",
      `Balance of the \`${address}\` - ${balance} is less than ${min}.`
    );
  }
}

/**
 * @typedef ErasInfo
 * @prop {Array<BN>} eras
 * @prop {Object<string, *>} pointsByEra
 * @prop {Object<string, *>} rewardsByEra
 * @prop {Object<string, *>} prefsByEra
 */

/**
 * Fetches information about the recent eras.
 *
 * @param {*} api
 * @returns {ErasInfo}
 */
const fetchErasInfo = async (api) => {
  const eras = await api.derive.staking.erasHistoric();
  const indexByEra = indexBy(o((era) => era.toString(), prop("era")));

  const [pointsByEra, rewardsByEra, prefsByEra] = await Promise.all([
    api.derive.staking._erasPoints(eras),
    api.derive.staking._erasRewards(eras),
    api.derive.staking._erasPrefs(eras),
  ]).then(map(indexByEra));

  return {
    eras,
    pointsByEra,
    rewardsByEra,
    prefsByEra,
  };
};

/**
 * Returns unclaimed era rewards for the stash with the given id.
 *
 * @param {*} api
 * @param {Array<BN>} allEras
 * @param {string} stashId
 * @returns {Array<StashEras>}
 */
const getUnclaimedStashEras = curry(async (api, allEras, stashId) => {
  let controllerId = await api.query.staking.bonded(stashId);
  if (controllerId.isNone) {
    return [];
  } else {
    controllerId = controllerId.unwrap();
  }

  const ledger = (
    await api.query.staking.ledger(controllerId)
  ).unwrapOrDefault();

  return differenceWith((a, b) => a.eq(b), allEras, ledger.claimedRewards);
});

/**
 * @typedef StashEras
 * @prop {Array<{ era: BN, eraReward: BN, reward: BN }>} eras
 * @prop {string} stashId
 */

/**
 * Returns an observable of unclaimed eras grouped by stash ids.
 *
 * @param {*} api
 * @param {ErasInfo} erasInfo
 * @param {*} stashIds
 * @returns {Observable<StashEras>}
 */
const getUnclaimedStashesEras = curry((api, { eras }, stashIds) =>
  // Concurrently get unclaimed eras for each of stashes
  from(stashIds).pipe(
    mergeMap(
      (stashId) =>
        from(getUnclaimedStashEras(api, eras, stashId)).pipe(
          // Filter out stashes with no unclaimed eras
          filterRx(complement(isEmpty)),
          mapRx(assoc("eras", __, { stashId }))
        ),
      ConcurrentRequestsLimit
    )
  )
);

/**
 * Signs and sends extrinsics produced by the given observable.
 *
 * @param {*} api
 * @param {*} initiator
 * @param {Observable<import("@polkadot/types/interfaces").Extrinsic>} txs$
 *
 * @returns {Observable<string>} executed tx with hashes
 */
const signAndSendExtrinsics = curry((api, initiator, txs$) => {
  // The first nonce to be used will come from the API call
  // To send several extrinsics simultaneously, we need to emulate increasing nonce
  return from(api.rpc.system.accountNextIndex(initiator.address)).pipe(
    switchMap((nonce) => {
      const sendExtrinsic = (tx) =>
        of(tx).pipe(
          switchMap((tx) => {
            const sentTx = dock.signAndSend(tx, true, { nonce });
            // Increase nonce by hand
            nonce = nonce.add(new BN(1));

            return from(
              Promise.race([sentTx, rejectTimeout(TxFinalizationTimeout)])
            );
          }),
          mapRx((result) => ({ tx, result })),
          catchError((error, caught) => {
            console.error(` * Transaction failed: ${error}`);
            const stringified = error.toString().toLowerCase();

            // Filter out errors related to balance and double-claim
            if (
              stringified.includes("balance") ||
              stringified.includes("alreadyclaimed")
            ) {
              return EMPTY;
            } else {
              // Retry an observable after the given timeout
              return timer(RetryTimeout).pipe(concatMapTo(caught));
            }
          })
        );

      return txs$.pipe(mergeMap(sendExtrinsic, ConcurrentTxLimit));
    })
  );
});

/**
 * Groups eras having some reward to be paid by validator stash accounts.
 *
 * @param {{ eras: *, pointsByEra: Object<string, *>, rewardsByEra: Object<string, *>, prefsByEra: Object<string, *> }} erasInfo
 * @param {Array<BN>} validatorEras
 * @returns {Object<string, { era: BN, reward: BN }>}
 */
const buildValidatorRewards = curry(
  ({ pointsByEra, rewardsByEra, prefsByEra }, validatorEras) => {
    const stashErasReducer = (acc, { eras, stashId }) => {
      const eraReducer = (acc, era) => {
        const eraKey = era.toString();
        const eraPoints = pointsByEra[eraKey];
        const eraRewards = rewardsByEra[eraKey];
        const eraPrefs = prefsByEra[eraKey];

        if (
          // Reward must be greater than 0
          eraPoints?.eraPoints.gt(new BN(0)) &&
          // We must have a stash as a validator in the given era
          eraPoints?.validators[stashId] &&
          // Era rewards should be defined
          eraRewards &&
          // Validator commission in the given era should be acceptable
          eraPrefs.validators[stashId]?.commission?.toBn().lte(MaxCommission)
        ) {
          const reward = eraPoints.validators[stashId]
            .mul(eraRewards.eraReward)
            .div(eraPoints.eraPoints);

          if (!reward.isZero())
            return acc.concat({
              era,
              reward,
            });
        }

        return acc;
      };

      return eras.reduce(eraReducer, acc);
    };

    return o(
      // Filter out stashes with no rewards
      reject(isEmpty),
      // Reduce given stash eras by the stash id
      reduceBy(stashErasReducer, [], prop("stashId"))
    )(validatorEras);
  }
);
