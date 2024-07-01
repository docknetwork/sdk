import BN from 'bn.js';
import {
  from, lastValueFrom, timer, EMPTY, defer,
} from 'rxjs';
import {
  tap,
  map as mapRx,
  filter as filterRx,
  mergeMap,
  concatMap,
  switchMap,
  toArray,
  concatMapTo,
  catchError,
} from 'rxjs/operators';
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
  either,
} from 'ramda';

import dotenv from 'dotenv';
import { sendAlarmEmailText } from './email_utils';
import {
  batchExtrinsics,
  envObj,
  notNilAnd,
  timeout,
  finiteNumber,
  formatDock,
  parseBool,
  withDockAPI,
} from './helpers';

dotenv.config();

const {
  FullNodeEndpoint,
  StakingPayoutsAlarmEmailTo,
  InitiatorAccountURI,
  BatchSize,
  ConcurrentRequestsLimit,
  ConcurrentTxLimit,
  RetryTimeout,
  MaxCommission,
  AlarmBalance,
  TxFinalizationTimeout,
  IterationTimeout,
  FinalizeTx,
  TargetStashIds,
  TargetAllValidatorsMatchingCriteria,
} = envObj({
  // Address of the node RPC.
  FullNodeEndpoint: notNilAnd(String),
  // List of email addresses separated by comma to send alarm email to.
  StakingPayoutsAlarmEmailTo: notNilAnd(split(',')),
  // Account to send transactions from.
  InitiatorAccountURI: notNilAnd(String),
  // Max batch size.
  BatchSize: o(finiteNumber, defaultTo(5)),
  // Max amount of concurrent requests.
  ConcurrentRequestsLimit: o(finiteNumber, defaultTo(10)),
  // Max amount of concurrent transactions.
  ConcurrentTxLimit: o(finiteNumber, defaultTo(5)),
  // Timeout to wait before retry transaction. In ms.
  RetryTimeout: o(finiteNumber, defaultTo(5e3)),
  // Max commission allowed to be set for validators. Default is 5%. Used as a criteria if `TargetAllValidatorsMatchingCriteria` is enabled.
  MaxCommission: o((val) => new BN(val), defaultTo('50000000')),
  // Min account balance to ring the alarm.
  AlarmBalance: notNilAnd((val) => new BN(val)),
  // Time to wait for transaction to be finalized. In ms.
  TxFinalizationTimeout: o(finiteNumber, defaultTo(3e4)),
  // Time to wait for all payments to be sent in an iteration before returning with an error. In ms.
  IterationTimeout: o(finiteNumber, defaultTo(4e5)),
  // Finalize the transaction or just wait for it to be included in the block.
  FinalizeTx: parseBool,
  // List of validator stashes to make payouts to independently of matching criteria or not.
  TargetStashIds: pipe(defaultTo(''), split(','), reject(isEmpty)),
  // Target all validators matching criteria along with targeting supplied stash id list.
  TargetAllValidatorsMatchingCriteria: parseBool,
});

if (!TargetAllValidatorsMatchingCriteria && TargetStashIds.length === 0) {
  throw new Error(
    'No target validators were found. You can provide list of validator stash ids by specifying `TargetStashIds` or force all validators to be checked by setting `TargetAllValidatorsMatchingCriteria` to `true`',
  );
}

const main = withDockAPI(
  {
    address: FullNodeEndpoint,
  },
  async (dock) => {
    const initiator = dock.keyring.addFromUri(InitiatorAccountURI);

    console.log('Pre-work balance check.');
    const balanceIsOk = await checkBalance(
      dock.api,
      StakingPayoutsAlarmEmailTo,
      initiator.address,
      AlarmBalance,
    );

    console.log('Fetching eras info...');
    const erasInfo = await fetchErasInfo(dock.api);

    console.log('Calculating and sending payouts:');
    let needToRecheck;

    try {
      needToRecheck = await timeout(
        IterationTimeout,
        sendStakingPayouts(dock, erasInfo, initiator, BatchSize),
      );
    } catch (err) {
      needToRecheck = true;
      console.error(err);
    }

    if (needToRecheck) {
      // Check payouts again with a batch size of 1
      // This is needed to execute valid transactions packed in invalid batches
      console.log('Checking payouts again:');
      await timeout(
        IterationTimeout,
        sendStakingPayouts(dock, erasInfo, initiator, 1),
      );
    }

    if (balanceIsOk) {
      console.log('Post-work balance check.');
      await checkBalance(
        dock.api,
        StakingPayoutsAlarmEmailTo,
        initiator.address,
        AlarmBalance,
      );
    }

    console.log('Done!');
  },
);

/**
 * @typedef EraInfo
 * @prop {*} points
 * @prop {*} rewards
 * @prop {*} prefs
 */

/**
 * Ensures that supplied validator's commission in the given era is less or equal to the supplied value.
 * @param {BN} maxCommission
 * @param {string} stashId
 * @param {*} EraInfo
 * @returns {bool}
 */
const ensureCommissionLessOrEqualTo = curry(
  (maxCommission, stashId, { prefs }) => prefs.validators[stashId]?.commission?.toBn().lte(maxCommission),
);

/**
 * Sends staking payouts for recent eras using the given sender account.
 *
 * @param {DockAPI} dock
 * @param {ErasInfo} erasInfo
 * @param {*} initiator - account to send tx from
 * @param {number} batchSize
 * @returns {Promise<boolean>} - `true` if some unpaid eras were found, `false` otherwise
 */
async function sendStakingPayouts(dock, erasInfo, initiator, batchSize) {
  const targetValidatorStashIds = new Set(TargetStashIds);

  let validatorStashIds;
  if (TargetAllValidatorsMatchingCriteria) {
    console.log(
      `- Payouts will be made to target validator stashes ${JSON.stringify([
        ...targetValidatorStashIds,
      ])} and all validators matching criteria`,
    );

    validatorStashIds = pipe(
      values,
      pluck('validators'),
      chain(keys),
      (valitors) => new Set(valitors),
    )(erasInfo.pointsByEra);
  } else {
    console.log(
      `- Payouts will be made only to target validator stashes ${JSON.stringify(
        [...targetValidatorStashIds],
      )}`,
    );
    validatorStashIds = targetValidatorStashIds;
  }

  if (!validatorStashIds.size) {
    console.log('- Validator set is empty.');
    return false;
  }

  console.log('- Retrieving validator eras...');
  const erasToBePaid = await lastValueFrom(
    from(validatorStashIds).pipe(
      getUnclaimedStashesEras(dock.api, erasInfo),
      toArray(),
    ),
  );

  // Payout validator if it's either in a target list or satisfies criteria.
  const checkValidator = either(
    (validatorStashId) => targetValidatorStashIds.has(validatorStashId),
    ensureCommissionLessOrEqualTo(MaxCommission),
  );

  const rewards = pipe(buildValidatorRewards, toPairs)(
    checkValidator,
    erasInfo,
    erasToBePaid,
  );

  if (isEmpty(rewards)) {
    console.log('- No unpaid validator rewards found for recent eras.');
    return false;
  }

  console.log('- Payouts need to be made:');

  for (const [stashId, eras] of rewards) {
    const total = eras.reduce(
      (total, { reward }) => (total != null ? total.add(reward) : reward),
      null,
    );

    console.log(` * To \`${stashId}\`: ${formatDock(total)}`);
  }

  const logResult = ({ result, tx }) => {
    // There's a much better way to check this...
    const isBatch = tx.method.args?.[0]?.[0] instanceof Map;

    let msg = ' * ';
    if (isBatch) msg += 'Batch transaction';
    else msg += 'Transaction';

    if (FinalizeTx) {
      msg += ` finalized at block \`${result.status.asFinalized}\`: `;
    } else {
      msg += ` included at block \`${result.status.asInBlock}\`: `;
    }

    const payoutsSummary = (isBatch ? tx.method.args[0] : [tx.method])
      .map((payout) => payout.get('args'))
      .map(
        ({ validator_stash, era }) => `\`${validator_stash}\` rewarded for era ${era}`,
      )
      .join(isBatch ? ',\n    ' : ',');

    msg += isBatch ? `[\n    ${payoutsSummary}\n ]` : payoutsSummary;

    console.log(msg);
  };

  const payoutTxs$ = from(rewards).pipe(
    concatMap(([stashId, eras]) => from(eras.map(assoc('stashId', stashId)))),
    mapRx(({ stashId, era }) => dock.api.tx.staking.payoutStakers(stashId, era)),
    batchExtrinsics(dock.api, batchSize),
    signAndSendExtrinsics(dock, initiator),
    tap(logResult),
  );

  await new Promise((resolve, reject) => payoutTxs$.subscribe({
    error: reject,
    complete: resolve,
  }));

  return true;
}

/**
 * Checks balance of the given account.
 * In case it's lower than the minimum value, will send an alarm email.
 *
 * @param {*} api
 * @param {Array<string> | string} emailAddr - address to send email to
 * @param {*} accountAddress - account to check balance of
 * @param {BN} min - minimum balance to ring alarm
 */
async function checkBalance(api, emailAddr, accountAddress, min) {
  const {
    data: { free: balance },
  } = await api.query.system.account(accountAddress);

  if (balance.lt(min)) {
    console.error(
      `Balance of the \`${accountAddress}\` - ${formatDock(
        balance,
      )} is less than ${formatDock(min)}.`,
    );

    await sendAlarmEmailText(
      emailAddr,
      'Low balance of the staking payouts sender',
      `Balance of the \`${accountAddress}\` - ${formatDock(
        balance,
      )} is less than ${formatDock(min)}.`,
    );

    return false;
  }

  return true;
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
 * @returns {Promise<ErasInfo>}
 */
const fetchErasInfo = async (api) => {
  const eras = await api.derive.staking.erasHistoric();
  const indexByEra = indexBy(o((era) => era.toString(), prop('era')));

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
 * @returns {Promise<Array<StashEras>>}
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
 * @param {Observable<string>} stashIds
 * @returns {Observable<StashEras>}
 */
const getUnclaimedStashesEras = curry((api, { eras }, stashIds$) =>
  // Concurrently get unclaimed eras for each of stashes
  stashIds$.pipe(
    mergeMap(
      (stashId) => from(getUnclaimedStashEras(api, eras, stashId)).pipe(
        // Filter out stashes with no unclaimed eras
        filterRx(complement(isEmpty)),
        mapRx(assoc('eras', __, { stashId })),
      ),
      ConcurrentRequestsLimit,
    ),
  ));

/**
 * Signs and sends extrinsics produced by the given observable.
 *
 * @param {*} api
 * @param {*} initiator
 * @param {Observable<import("@polkadot/types/interfaces").Extrinsic>} txs$
 *
 * @returns {Observable<{ result: *, tx: * }>} executed transaction with result
 */
const signAndSendExtrinsics = curry((dock, initiator, txs$) =>
  // The first nonce to be used will come from the API call
  // To send several extrinsics simultaneously, we need to emulate increasing nonce
  from(dock.api.rpc.system.accountNextIndex(initiator.address)).pipe(
    switchMap((nonce) => {
      const sendExtrinsic = (tx) => defer(() => {
        dock.setAccount(initiator);
        const sentTx = dock.signAndSend(tx, FinalizeTx, { nonce });
        // Increase nonce by hand
        nonce = nonce.add(new BN(1));

        return from(timeout(TxFinalizationTimeout, sentTx));
      }).pipe(
        mapRx((result) => ({ tx, result })),
        catchError((error, caught) => {
          console.error(` * Transaction failed: ${error}`);
          const stringified = error.toString().toLowerCase();

          // Filter out errors related to balance, election and double-claim
          if (
            stringified.includes('balance')
              || stringified.includes('alreadyclaimed')
              || stringified.includes('invalid transaction')
              || stringified.includes('election')
          ) {
            return EMPTY;
          } else {
            // Retry an observable after the given timeout
            return timer(RetryTimeout).pipe(concatMapTo(caught));
          }
        }),
      );

      return txs$.pipe(mergeMap(sendExtrinsic, ConcurrentTxLimit));
    }),
  ));

/**
 * Groups eras having some reward to be paid by validator stash accounts.
 *
 * @param {function(string, EraInfo): boolean} checkValidatorInEra - checks if validator in the era has an acceptable configuration
 * @param {ErasInfo} erasInfo
 * @param {Array<{ stashId: string, eras: Array<BN> }>} validatorEras
 *
 * @returns {Object<string, { era: BN, reward: BN }>}
 */
const buildValidatorRewards = curry(
  (
    checkValidatorInEra,
    { pointsByEra, rewardsByEra, prefsByEra },
    validatorEras,
  ) => {
    const stashErasReducer = (acc, { eras, stashId }) => {
      const eraReducer = (acc, era) => {
        const eraKey = era.toString();
        const eraPoints = pointsByEra[eraKey];
        const eraRewards = rewardsByEra[eraKey];
        const eraPrefs = prefsByEra[eraKey];
        const eraInfo = {
          points: eraPoints,
          rewards: eraRewards,
          prefs: eraPrefs,
        };

        if (
          // Points must be greater than 0
          eraPoints?.eraPoints.gt(new BN(0))
          // We must have a stash as a validator in the given era
          && eraPoints?.validators[stashId]
          // Era rewards and prefs should be defined
          && eraRewards
          && eraPrefs
          // Validator configuration in the era should be acceptable
          && checkValidatorInEra(stashId, eraInfo)
        ) {
          const reward = eraPoints.validators[stashId]
            .mul(eraRewards.eraReward)
            .div(eraPoints.eraPoints);

          if (!reward.isZero()) {
            return acc.concat({
              era,
              reward,
            });
          }
        }

        return acc;
      };

      return eras.reduce(eraReducer, acc);
    };

    return o(
      // Filter out stashes with no rewards
      reject(isEmpty),
      // Reduce given stash eras by the stash id
      reduceBy(stashErasReducer, [], prop('stashId')),
    )(validatorEras);
  },
);

export const handler = async () => {
  await timeout(IterationTimeout * 2.5, main());

  return 'Done';
};

if (require.main === module) {
  console.log('Executing the script...');

  handler()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .then(() => process.exit());
}

export default handler;
