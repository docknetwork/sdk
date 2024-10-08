import { o, defaultTo, unless, either, curry, __, sum } from "ramda";
import BN from "bn.js";
import { toArray, from, mergeMap, lastValueFrom } from "rxjs";
import { validateAddress } from "../src/utils/chain-ops";
import {
  withDockAPI,
  formatDock,
  envObj,
  notNilAnd,
  finiteNumber,
  parseBool,
  binarySearchFirstSatisfyingBlock,
} from "./helpers";

const greaterThanZero = unless(
  (value) => value > 0,
  () => {
    throw new Error("Must be greater than zero");
  },
);

const {
  FullNodeEndpoint,
  Stash,
  StartEra,
  ErasCount,
  IncludeBlocks,
  Debug,
  BlocksPerEra,
  SessionsPerEra,
  ConcurrentErasLimit,
} = envObj({
  // Address of the node RPC.
  FullNodeEndpoint: notNilAnd(String),
  // Account to summarise payouts for.
  Stash: o(
    unless(
      either(
        (addr) => validateAddress(addr, "test"),
        (addr) => validateAddress(addr, "main"),
      ),
      (addr) => {
        throw new Error(`Invalid stash address: ${addr}`);
      },
    ),
    notNilAnd(String),
  ),
  // Start era to summarise payouts from.
  StartEra: o(greaterThanZero, notNilAnd(finiteNumber)),
  // Amount of eras to calculate payout for starting from `StartEra`.
  ErasCount: o(greaterThanZero, notNilAnd(finiteNumber)),
  // Include block counts into the reports.
  IncludeBlocks: parseBool,
  // Enable debug logs.
  Debug: parseBool,
  // Number of blocks per a single era.
  BlocksPerEra: o(finiteNumber, defaultTo(14400)),
  // Number of sessions per a single era.
  SessionsPerEra: o(finiteNumber, defaultTo(4)),
  // Number of eras to be processed concurrently
  ConcurrentErasLimit: o(finiteNumber, defaultTo(10)),
});

const main = withDockAPI(
  {
    address: FullNodeEndpoint,
  },
  async (dock) => {
    const activeEraIndex = (await dock.api.query.staking.activeEra())
      .unwrap()
      .index.toNumber();

    if (activeEraIndex < StartEra + ErasCount) {
      throw new Error(
        `\`StartEra\` + \`ErasCount\` must be less or equal to ${activeEraIndex}`,
      );
    }
    if (BlocksPerEra % SessionsPerEra) {
      throw new Error(
        "Failed to calculate blocks per session, `BlocksPerEra` should be divisible by `SessionsPerEra` with zero remainder",
      );
    }

    const eraIndices = Array.from(
      { length: ErasCount },
      (_, idx) => StartEra + idx,
    );
    const lastBlock = (await dock.api.query.system.number()).toNumber();

    const validatorEraResults$ = from(eraIndices).pipe(
      mergeMap(
        o(from, async (eraIndex) => {
          const startBlock = Math.max(
            lastBlock - BlocksPerEra * (activeEraIndex - eraIndex),
            0,
          );

          const { hash: eraPaidBlockHash, number } = await findEraPaidBlock(
            dock,
            startBlock,
            lastBlock,
            eraIndex,
          );

          const eraPaidApi = await dock.api.at(eraPaidBlockHash);

          const blocks = IncludeBlocks
            ? await fetchProducedBlockCounts(dock, number)
            : null;

          const eraValidatorInfo = await fetchValidatorStashEraInfo(
            eraPaidApi,
            new BN(eraIndex),
            Stash,
          );

          let validatorPoints = new BN(0);
          for (const [key, value] of eraValidatorInfo.points.individual) {
            if (key.toString() === Stash) {
              validatorPoints = value;
            }
          }

          const eraValidatorPayout = validatorPoints.isZero()
            ? {
                total: new BN(0),
                staking: new BN(0),
                commission: new BN(0),
              }
            : validatorStashPayout(
                eraValidatorInfo.prefs,
                validatorPoints,
                eraValidatorInfo.exposure,
                eraValidatorInfo.points.total,
                eraValidatorInfo.rewards,
              );

          return [
            eraIndex,
            { ...eraValidatorPayout, blocks, prefs: eraValidatorInfo.prefs },
          ];
        }),
        ConcurrentErasLimit,
      ),
    );
    const validatorEraResults = await lastValueFrom(
      validatorEraResults$.pipe(toArray()),
    );

    const { total, staking, commission, blocks } = validatorEraResults
      .sort(([i1], [i2]) => i1 - i2)
      .reduce(
        (acc, [index, { total, staking, commission, blocks, prefs }]) => {
          console.log(
            `Era ${index}: paid = \`${formatDock(
              total,
            )}\` (staking = ${formatDock(staking)}, commission = ${formatDock(
              commission,
            )}), commission = ${prefs.commission.toNumber() / 1e7}%${
              blocks != null ? `, blocks produced = ${blocks.join("/")}` : ""
            }`,
          );

          return {
            total: acc.total.add(total),
            staking: acc.staking.add(staking),
            commission: acc.commission.add(commission),
            blocks: blocks != null ? acc.blocks + sum(blocks) : null,
          };
        },
        {
          total: new BN(0),
          staking: new BN(0),
          commission: new BN(0),
          blocks: 0,
        },
      );

    console.log(
      `Summarised stash payout for ${Stash} in ${StartEra}-${
        StartEra + ErasCount - 1
      } eras - total = \`${formatDock(total, {
        forceUnit: "DCK",
      })}\`: staking = \`${formatDock(staking, {
        forceUnit: "DCK",
      })}\`, commission = \`${formatDock(commission, { forceUnit: "DCK" })}\`${
        blocks != null
          ? `, average blocks per session = ${
              blocks / eraIndices.length / SessionsPerEra
            }`
          : ""
      }`,
    );
  },
);

const fetchProducedBlockCounts = async (dock, number) => {
  const api = await apiAtBlock(dock, number - 1);
  const lastSessionIndex = await api.query.session.currentIndex();

  const sessionEnds = await Promise.all(
    Array.from({ length: SessionsPerEra - 1 }, (_, idx) =>
      findNewSession(
        dock,
        (number - (BlocksPerEra * (idx + 1)) / SessionsPerEra) | 0,
        number,
        lastSessionIndex.toNumber() - idx - 1,
      ),
    ).reverse(),
  );

  const sessionAPIs = [
    ...(await Promise.all(
      sessionEnds.map(({ number }) => apiAtBlock(dock, number - 1)),
    )),
    api,
  ];

  return await Promise.all(sessionAPIs.map(countStashSessionBlocks(__, Stash)));
};

/**
 * Instantiates an API at the block with the supplied number.
 * @param {*} dock
 * @param {number} number
 * @returns {Promise<ApiPromise>}
 */
const apiAtBlock = async (dock, number) =>
  await dock.api.at(await dock.api.rpc.chain.getBlockHash(number));

/**
 * Returns the amount of blocks produced by the supplied stash during the current session.
 * @param {*} api
 * @param {*} stash
 * @returns {Promise<number>}
 */
const countStashSessionBlocks = curry(async (api, stash) => {
  const sessionIndex = await api.query.session.currentIndex();
  const authoredBlocks = await api.query.imOnline.authoredBlocks(
    sessionIndex,
    stash,
  );

  return authoredBlocks.toNumber();
});

/**
 * Returns hash of the block when `EraPaid` was emitted for the `targetEra`.
 * Throws an error in case such block can't be found.
 *
 * @param {*} dock
 * @param {*} startBlockNumber
 * @param {*} endBlockNumber
 * @param {*} targetEra
 */
const findEraPaidBlock = async (
  dock,
  startBlockNumber,
  endBlockNumber,
  targetEra,
) =>
  binarySearchFirstSatisfyingBlock(
    dock.api,
    {
      startBlockNumber,
      endBlockNumber,
      fetchValue: async (blockHash) => {
        const activeEra = await dock.api.query.staking.activeEra.at(blockHash);

        return activeEra.unwrap().index.toNumber();
      },
      targetValue: targetEra + 1,
      checkBlock: (block) =>
        block.events
          .toHuman()
          .find(
            ({ event: { method, section } }) =>
              section === "staking" &&
              (method === "EraPayout" || method === "EraPaid"),
          ),
    },
    { maxBlocksPerUnit: BlocksPerEra, debug: Debug },
  );

/**
 * Returns hash of the block when `NewSession` was emitted for the `targetSession`.
 * Throws an error in case such block can't be found.
 *
 * @param {*} dock
 * @param {*} startBlockNumber
 * @param {*} endBlockNumber
 * @param {*} targetEra
 */
const findNewSession = async (
  dock,
  startBlockNumber,
  endBlockNumber,
  targetSession,
) =>
  binarySearchFirstSatisfyingBlock(
    dock.api,
    {
      startBlockNumber,
      endBlockNumber,
      fetchValue: async (blockHash) => {
        const sessionIndex =
          await dock.api.query.session.currentIndex.at(blockHash);

        return sessionIndex.toNumber();
      },
      targetValue: targetSession + 1,
      checkBlock: (block) =>
        block.events
          .toHuman()
          .find(
            ({ event: { method, section } }) =>
              section === "session" && method === "NewSession",
          ),
    },
    { maxBlocksPerUnit: BlocksPerEra / SessionsPerEra, debug: Debug },
  );
/**
 * Fetches information about the era for the supplied validator.
 *
 * @param dock
 * @param blockHash
 * @param eraIndex
 * @param stash
 */
const fetchValidatorStashEraInfo = async (api, eraIndex, stash) => {
  const [rewards, points, prefs, exposure] = await Promise.all([
    api.query.staking.erasValidatorReward(eraIndex),
    api.query.staking.erasRewardPoints(eraIndex),
    api.query.staking.erasValidatorPrefs(eraIndex, stash),
    api.query.staking.erasStakersClipped(eraIndex, stash),
  ]);

  return {
    points,
    rewards: rewards.unwrap(),
    prefs,
    exposure,
  };
};

/**
 * Calculates `total`, `staking` and `commission` payout for the validator stash.
 *
 * @param validatorPref
 * @param validatorRewardPoints
 * @param validatorExposure
 * @param eraRewardPoints
 * @param eraPayout
 */
const validatorStashPayout = (
  validatorPref,
  validatorRewardPoints,
  validatorExposure,
  eraRewardPoints,
  eraPayout,
) => {
  // This is how much validator + nominators are entitled to.
  const validatorTotalPayout = eraPayout
    .mul(validatorRewardPoints)
    .div(eraRewardPoints);

  // Validator first gets a cut off the top.
  const validatorCommissionPayout = new BN(
    validatorTotalPayout.toNumber() *
      (validatorPref.commission.toNumber() / 1e9),
  );
  const validatorLeftOverPart = validatorTotalPayout.sub(
    validatorCommissionPayout,
  );

  // Now let's calculate how this is split to the validator.
  const validatorStakingPayout = validatorLeftOverPart
    .mul(new BN(validatorExposure.own.toNumber()))
    .div(new BN(validatorExposure.total.toNumber()));

  return {
    total: validatorStakingPayout.add(validatorCommissionPayout),
    staking: validatorStakingPayout,
    commission: validatorCommissionPayout,
  };
};

main().catch(console.error);
