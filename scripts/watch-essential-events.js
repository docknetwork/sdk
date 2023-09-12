import {
  equals,
  includes,
  lensProp,
  curry,
  all,
  allPass,
  addIndex,
  filter,
  F,
  splitAt,
  prop,
  assoc,
  cond,
  view,
  either,
  T,
  __,
  last,
  split,
  pipe,
  o,
  when,
  always,
  isEmpty,
  both,
  flip,
  complement,
  isNil,
  converge,
  ifElse,
  identity,
  findIndex,
  any,
  unless,
  curryN,
  defaultTo,
  head,
  reduce,
  inc,
  min,
  max,
  anyPass,
} from "ramda";
import {
  timeout,
  from,
  share,
  Observable,
  merge,
  tap,
  EMPTY,
  map as mapRx,
  concatMap,
  of,
  defer,
  filter as filterRx,
  catchError,
  concat,
  bufferTime,
  mergeMap,
  switchMap,
  repeat,
  withLatestFrom,
  takeWhile,
  shareReplay,
  scan,
  distinctUntilChanged,
  first,
  throwError,
  retry,
  Subject,
} from "rxjs";
import {
  envObj,
  formatDock,
  notNilAnd,
  finiteNumber,
  timestampLogger,
} from "./helpers";
import dock from "../src";
import { sendAlarmEmailHtml } from "./email_utils";

const {
  TxWatcherAlarmEmailTo,
  FullNodeEndpoint,
  LogLevel,
  BatchNoficationTimeout,
  StartBlock,
  BaseBlockExplorerUrl,
  BaseExtrinsicExplorerUrl,
  ConcurrentBlocksSyncLimit,
  BlockProcessingTimeOut,
  RetryDelay,
  RetryAttempts,
} = envObj({
  // Email to send alarm emails to.
  TxWatcherAlarmEmailTo: notNilAnd(split(",")),
  // Address of the node RPC.
  FullNodeEndpoint: notNilAnd(String),
  // Level of logs to be used for profiling: `debug` or null.
  LogLevel: unless(
    isNil,
    unless(includes(__, ["debug"]), () => {
      throw new Error('Allowed options: ["debug"]');
    })
  ),
  // Amount of time used to accumulate notifications into a single email.
  BatchNoficationTimeout: o(finiteNumber, defaultTo(3e3)),
  // Block number to start from.
  StartBlock: unless(isNil, finiteNumber),
  // Base explorer url to construct block address.
  BaseBlockExplorerUrl: defaultTo("https://dock.subscan.io/block"),
  // Base explorer url to construct extrinsic address.
  BaseExtrinsicExplorerUrl: defaultTo("https://dock.subscan.io/extrinsic"),
  // Max amount of blocks to be requested concurrently when syncing.
  ConcurrentBlocksSyncLimit: o(finiteNumber, defaultTo(100)),
  // Maximum time allowed for the block processing. The workflow will be launched if no block is processed within this time.
  BlockProcessingTimeOut: o(finiteNumber, defaultTo(1e4)),
  // Denotes how much time will be waiting prior to reconnecting.
  RetryDelay: o(finiteNumber, defaultTo(3e4)),
  // Amount of retry attempts before exiting with 1 code.
  RetryAttempts: o(finiteNumber, defaultTo(3)),
});

const main = async (dock, startBlock) => {
  await new Promise((resolve, reject) => {
    // The minimum number of the unprocessed block.
    let minUnprocessed = startBlock;

    return defer(() =>
      from(dock.disconnect()).pipe(
        switchMap(() => from(dock.init({ address: FullNodeEndpoint }))),
        switchMap(() => {
          const updates$ = processBlocks(dock, minUnprocessed);

          return updates$.pipe(
            tap((number) => {
              minUnprocessed = number;
            }),
            timeout({
              each: BlockProcessingTimeOut,
              with: () => {
                timestampLogger.log(`Timeout exceeded`);

                return throwError(() => `Timeout exceeded`);
              },
            })
          );
        })
      )
    )
      .pipe(
        retry({ delay: RetryDelay, count: RetryAttempts }),
        catchError(
          (error) =>
            void timestampLogger.error(error) ||
            from(
              sendAlarmEmailHtml(
                TxWatcherAlarmEmailTo,
                "Dock blockchain watcher was restarted",
                `<h2>Due to either connection or node API problems, the dock blockchain essential notifications watcher was restarted with the last unprocessed block ${minUnprocessed}.</h2>`
              )
            )
        )
      )
      .subscribe({ complete: () => resolve(null), error: reject });
  });
};

/**
 * Keeps track of the skipped blocks producing by `blocks$` observable treating `startBlock` as initial block.
 * Used to have the state of non-processed blocks.
 *
 * @param {startBlock?} - initial sync block
 * @param {Subject} - missed blocks sink
 * @param {Observable<Block>} - blocks
 * @returns {Observable<{maxSeqProcessed: number, maxReceived: number, block: Block}>}
 */
const trackSeqProcessed = curry((startBlock, missedBlocksSink, blocks$) => {
  const skipped = new Set();
  let maxReceived = startBlock != null ? (startBlock || 1) - 1 : null;

  return blocks$.pipe(
    mapRx((block) => {
      const received = block.block.header.number.toNumber();
      if (maxReceived == null) {
        maxReceived = received;
      }

      if (!skipped.delete(received) && received < maxReceived) {
        timestampLogger.log(
          `Syncing failure: skipped - `,
          skipped,
          "received - ",
          received,
          "maxReceived - ",
          maxReceived
        );
      }

      // Keep track of all the blocks which are missing.
      // They must be received later and processed, and in case of sync failure, we'll use the min number as the start block.
      for (let i = maxReceived + 1; i < received; i++) {
        missedBlocksSink.next(i);
        skipped.add(i);
      }
      maxReceived = max(received, maxReceived);
      const maxSeqProcessed = reduce(min, maxReceived, [...skipped]);

      return { maxReceived, maxSeqProcessed, block };
    })
  );
});

/**
 * Processes every block's extrinsics and events starting with the given block number.
 * Returns an observable emitting the minimum sequential unprocessed block number at the moment.
 *
 * @param {*} dock
 * @param {number} startBlock
 * @returns {Observable<number>} - last unprocessed block number
 */
const processBlocks = (dock, startBlock) => {
  const { ExtrinsicFailed } = dock.api.events.system;
  const mergeEventsWithExtrs = createTxWithEventsCombinator(dock);

  // Applies filters to the given observable
  const applyFilters = curry((filters, data$) => {
    const handleItem = withExtrinsicUrl(converge(merge, filters));

    return data$.pipe(mergeMap((item) => handleItem(item, dock)));
  });

  const missedBlocksSink = new Subject();
  const missedBlocks$ = missedBlocksSink.pipe(
    mergeMap(blockByNumber, ConcurrentBlocksSyncLimit)
  );

  return merge(subscribeBlocks(dock, startBlock), missedBlocks$).pipe(
    trackSeqProcessed(startBlock, missedBlocksSink),
    mergeMap(({ block, maxSeqProcessed }) => {
      // Flattens extrinsics returning transaction along with produced events
      const txs$ = from(
        block.extrinsics.flatMap(({ extrinsic, events }) => {
          return ExtrinsicFailed.is(last(events))
            ? []
            : mergeEventsWithExtrs(events, extrinsic, {
                rootTx: extrinsic,
                config: 0,
              }).extrinsics;
        })
      )
        .pipe(mapRx(assoc("block", block)))
        .pipe(share());

      // Each event repeats its transaction
      const events$ = txs$.pipe(
        concatMap(({ events, ...rest }) =>
          from(events).pipe(mapRx((event) => ({ event, events, ...rest })))
        )
      );

      const handleBlock$ = merge(
        txs$.pipe(
          tap(LogLevel === "debug" ? logTx : identity),
          applyFilters(txFilters)
        ),
        events$.pipe(applyFilters(eventFilters))
      ).pipe(
        batchNotifications(BatchNoficationTimeout),
        tap((email) => timestampLogger.log("Sending email: ", email)),
        mergeMap(
          o(
            from,
            sendAlarmEmailHtml(
              TxWatcherAlarmEmailTo,
              "Dock blockchain alarm notification"
            )
          )
        )
      );

      const number = block.block.header.number.toNumber();

      return concat(
        of({ maxSeqProcessed, number, state: 0 }),
        handleBlock$.pipe(tap(timestampLogger.log), filterRx(F)),
        of({ number, state: 1 })
      );
    }),
    scan(
      (
        { minUnprocessed, maxReceived, processing },
        { maxSeqProcessed = minUnprocessed, number, state }
      ) => {
        if (!state) processing.add(number);
        else processing.delete(number);

        return {
          minUnprocessed: reduce(min, maxSeqProcessed, [...processing]),
          processing,
          maxReceived: Math.max(maxReceived, number),
        };
      },
      {
        minUnprocessed: startBlock,
        maxReceived: startBlock,
        processing: new Set(),
      }
    ),
    mapRx(prop("minUnprocessed"))
  );
};

/**
 * Subscribes to blocks starting with the given block number.
 * Returns an observable emitting blocks.
 *
 * @param {*} dock
 * @param {*} startBlock
 * @returns {Observable<Block>}
 */
export const subscribeBlocks = curry((dock, startBlock) => {
  // Emits recently created blocks
  const currentBlocks$ = new Observable((sub) => {
    dock.api.derive.chain.subscribeNewBlocks((block) => {
      sub.next(block);
    });
  }).pipe(shareReplay(1));

  // Emits blocks starting from the specified number
  const previousBlocks$ =
    startBlock != null
      ? defer(() => syncPrevousBlocks(dock, startBlock, currentBlocks$))
      : EMPTY;

  return concat(
    // Wait for the first block to be emitted
    currentBlocks$.pipe(first(), filterRx(F)),
    defer(() =>
      concat(
        previousBlocks$.pipe(
          trackSeqProcessed(startBlock, new Subject()),
          withLatestFrom(currentBlocks$),
          concatMap(
            ([
              { block: latestSyncedBlock, maxSeqProcessed, maxReceived },
              currentBlock,
            ]) => {
              const curNumber = currentBlock.block.header.number.toNumber();
              const done =
                curNumber === maxReceived && maxSeqProcessed === maxReceived;

              if (done) {
                return of(latestSyncedBlock, null);
              } else {
                return of(latestSyncedBlock);
              }
            }
          ),
          takeWhile(Boolean)
        ),
        defer(() => {
          timestampLogger.log("Listening for new blocks");

          return EMPTY;
        }),
        currentBlocks$
      )
    )
  );
});

/**
 * Syncs blocks starting with the given block number.
 * Returns an observable emitting blocks.
 *
 * @param {*} dock
 * @param {*} startBlock
 * @param {Observable<Block>} currentBlocks$ - emits recent blocks
 * @returns {Observable<Block>}
 */
const syncPrevousBlocks = curry((dock, startBlock, currentBlocks$) => {
  timestampLogger.log(`Syncing blocks starting from ${startBlock}`);

  const blocks$ = of(startBlock).pipe(
    repeat(ConcurrentBlocksSyncLimit),
    repeat({
      delay: () => blocks$,
    }),
    withLatestFrom(currentBlocks$),
    scan((lastBlockNumber, [startBlockNumber, lastBlock]) => {
      const nextBlockNumber =
        lastBlockNumber == null ? startBlockNumber : inc(lastBlockNumber);

      if (lastBlock.block.header.number.toNumber() >= nextBlockNumber) {
        return nextBlockNumber;
      } else {
        return lastBlockNumber;
      }
    }, null),
    distinctUntilChanged(),
    mergeMap(blockByNumber, ConcurrentBlocksSyncLimit),
    share()
  );

  return blocks$;
});

/**
 * Retrieves a block associated with the given number.
 *
 * @param {*} number
 * @returns {Observable<*>}
 */
const blockByNumber = (number) =>
  of(number).pipe(
    concatMap((number) => from(dock.api.rpc.chain.getBlockHash(number))),
    concatMap((hash) => from(dock.api.derive.chain.getBlock(hash)))
  );

/**
 * Batches notifications received from the observable.
 */
export const batchNotifications = curry((timeLimit, notifications$) =>
  notifications$.pipe(
    bufferTime(timeLimit, null),
    filterRx(complement(isEmpty)),
    mapRx((batch) => batch.join("<br />"))
  )
);

const sectionLens = lensProp("section");
const methodLens = lensProp("method");

/**
 * Filters given entity by its `section`/`method(s)`
 */
const methodFilter = curry((section, methods) =>
  allPass([
    o(equals(section), view(sectionLens)),
    o(includes(__, [].concat(methods)), view(methodLens)),
  ])
);

/**
 * Filters given event by its `section`/`method(s)`
 */
const eventByMethodFilter = curry(pipe(methodFilter, o(__, prop("event"))));
/**
 * Filters extrinsics to contain at least one event with the given `section`/`method(s)`
 */
const anyEventByMethodFilter = curry(
  pipe(methodFilter, any, o(__, prop("events")))
);
/**
 * Filters extrinsics by its `section`/`method(s)`.
 */
const txByMethodFilter = curry(
  pipe(
    methodFilter,
    o(
      __,
      o(
        when(({ method }) => typeof method === "object", view(methodLens)),
        prop("tx")
      )
    )
  )
);

/**
 * Returns `true` if given extrinsic has a valid `sudo` event.
 */
const isValidSudo = pipe(
  prop("events"),
  filter(methodFilter("sudo", ["Sudid", "SudoAsDone"])),
  ifElse(
    isEmpty,
    F,
    all((event) => event.data.toJSON()[0].err == null)
  )
);

/**
 * Returns `true` if given extrinsic was executed successfully.
 */
const successfulTx = both(
  either(
    complement(anyEventByMethodFilter("sudo", ["Sudid", "SudoAsDone"])),
    isValidSudo
  ),
  complement(
    either(
      anyEventByMethodFilter("utility", "BatchInterrupted"),
      anyEventByMethodFilter("system", "ExtrinsicFailed")
    )
  )
);
/**
 * Filters successful extrinsics by its `section`/`method(s)`.
 */
const successfulTxByMethodFilter = curry(
  pipe(txByMethodFilter, both(successfulTx))
);
/**
 * Validates given input against supplied predicate producing an observable.
 */
const checkMap = ifElse(__, __, always(EMPTY));

/**
 * Builds formatted urls to the extrinsic and its block.
 */
const buildExtrinsicUrl = curry(
  (blockNumber, txHash) =>
    `<a href="${BaseBlockExplorerUrl}/${blockNumber.toString()}">block #${blockNumber.toString()}</a> as <a href="${BaseExtrinsicExplorerUrl}/${txHash.toString()}">extrinsic ${txHash.toString()}</a>.`
);
/**
 * Enhances observable returned by the given function by adding url to the extrinsic and its block.
 * @param {*} fn
 * @returns
 */
const withExtrinsicUrl = (fn) =>
  curryN(fn.length, (...args) =>
    fn(...args).pipe(
      concatMap((msg) => {
        const signer =
          args[0].rootTx?.signature?.signer?.toString() ||
          args[0].rootTx?.signer?.toString();

        return from(
          args[1].api.query.timestamp.now.at(args[0].block.block.header.hash)
        ).pipe(
          mapRx(
            (timestamp) =>
              `${msg} ${
                signer ? `by <b>${signer}</b>` : "sent unsigned"
              } at ${new Date(
                +timestamp.toString()
              ).toUTCString()} in ${buildExtrinsicUrl(
                args[0].block.block.header.number,
                args[0].rootTx?.hash
              )}`
          )
        );
      })
    )
  );

/**
 * Filter events produced by `democracy` pallet.
 */
const democracyEvent = eventByMethodFilter("democracy");
/**
 * Filter events produced by `council` pallet.
 */
const councilEvent = eventByMethodFilter("council");
/**
 * Filter events produced by `balances` pallet.
 */
const balancesEvent = eventByMethodFilter("balances");
/**
 * Filter events produced by `technicalCommittee` pallet.
 */
const technicalCommitteeEvent = eventByMethodFilter("technicalCommittee");
/**
 * Filter events produced by `technicalCommitteeMembership` pallet.
 */
const technicalCommitteeMembershipEvent = eventByMethodFilter(
  "technicalCommitteeMembership"
);
/**
 * Filter events produced by `elections` pallet.
 */
const electionsEvent = eventByMethodFilter("elections");

/**
 * Filter extrinsics produced by `technicalCommitteeMembership` pallet.
 */
const technicalCommitteeMembershipTx = successfulTxByMethodFilter(
  "technicalCommitteeMembership"
);
/**
 * Filter extrinsics from `democracy` pallet.
 */
const democracyTx = successfulTxByMethodFilter("democracy");
/**
 * Filter extrinsics from `balances` pallet.
 */
const balancesTx = successfulTxByMethodFilter("balances");
/**
 * Filter extrinsics from `system` pallet.
 */
const systemTx = successfulTxByMethodFilter("system");
/**
 * Filter extrinsics from `elections` pallet.
 */
const electionsTx = successfulTxByMethodFilter("elections");

const txFilters = [
  checkMap(isValidSudo, () => of(`\`sudo\` transaction executed`)),
  // Council candidacy submission
  checkMap(electionsTx("submitCandidacy"), () =>
    of(`Self-submitted as a council candidate`)
  ),

  // Council member removal
  checkMap(
    electionsTx("removeMember"),
    ({
      tx: {
        args: [member],
      },
    }) => of(`Council member removed ${member.toString()}`)
  ),

  // `set_code` call
  checkMap(systemTx("setCode"), () => of(`New runtime code was set`)),

  // `set_code_without_checks` call
  checkMap(systemTx("setCodeWithoutChecks"), () =>
    of(`New runtime code was set without checks`)
  ),

  // `set_storage` call
  checkMap(systemTx("setStorage"), () => of(`Storage was modified directly`)),

  // Democracy proposal seconded
  checkMap(
    democracyTx("second"),
    ({
      tx: {
        args: [idx],
      },
    }) => of(`Proposal #${idx.toString()} is seconded`)
  ),

  // Democracy proposal fast-tracked
  checkMap(
    democracyTx("fastTrack"),
    ({
      tx: {
        args: [proposalHash],
      },
    }) => of(`Proposal is fast-tracked: ${proposalHash.toString()}`)
  ),

  // `force_transfer` call
  checkMap(balancesTx("forceTransfer"), ({ tx }) => {
    const [source, dest, value] = tx.args;

    return of(
      `\`force_transfer\` was made from ${source} to ${dest} with amount of ${formatDock(
        value
      )}`
    );
  }),

  // Democracy proposal cancelled
  checkMap(
    democracyTx("cancelProposal"),
    ({
      tx: {
        args: [proposalIndex],
      },
    }) => of(`Proposal #${proposalIndex.toString()} was cancelled`)
  ),
];

const eventFilters = [
  // Democracy proposal
  checkMap(
    democracyEvent("Proposed"),
    ({
      tx: {
        args: [hash],
      },
    }) => of(`New Democracy proposal: ${hash}`)
  ),

  // Democracy preimage noted for the proposal
  checkMap(
    democracyEvent("PreimageNoted"),
    ({
      event: {
        data: [proposalHash],
      },
    }) => {
      const proposal = dock.api.createType("Call", preimage);
      const metadata = dock.api.registry.findMetaCall(proposal.callIndex);

      return of(
        `Proposal preimage is noted for ${proposalHash.toString()}: ${
          metadata.section
        }::${metadata.method} with args ${JSON.stringify(
          proposal.toJSON().args
        )}`
      );
    }
  ),

  // Council proposal created
  checkMap(councilEvent("Proposed"), ({ event }, dock) => {
    const {
      data: [_, __, hash],
    } = event.toJSON();

    return from(dock.api.query.council.proposalOf(hash)).pipe(
      mapRx((proposal) => {
        if (proposal.isNone) {
          return `New Council proposal ${hash}`;
        } else {
          const { args, section, method } = proposal.unwrap();

          return `New Council proposal ${section}::${method}(${JSON.stringify(
            args
          )})`;
        }
      })
    );
  }),

  // Council proposal closed
  checkMap(councilEvent("Closed"), ({ event }) => {
    const {
      data: [hash, yesVotes, noVotes],
    } = event.toJSON();

    return of(
      `Council proposal ${hash} closed with ${yesVotes} yes/${noVotes} no`
    );
  }),

  // Council member renounced
  checkMap(
    electionsEvent("Renounced"),
    ({
      event: {
        data: [member],
      },
    }) => of(`Council member renounced: ${member.toString()}`)
  ),

  // Council members changed
  checkMap(
    electionsEvent("NewTerm"),
    ({
      event: {
        data: [newMembers],
      },
    }) => {
      return of(
        `Council membership changed. New members: ${newMembers
          .toJSON()
          .map(head)}`
      );
    }
  ),

  // `set_balance` call
  checkMap(balancesEvent("BalanceSet"), ({ event }) => {
    const [who, free, reserved] = event.data.toJSON();

    return of(
      `\`set_balance\` was called on ${who}: free: ${formatDock(
        free
      )}, reserved: ${formatDock(reserved)}`
    );
  }),

  // Techinal Committee proposal
  checkMap(technicalCommitteeEvent("Proposed"), ({ event }, dock) => {
    const {
      data: [_, __, hash],
    } = event.toJSON();

    return from(dock.api.query.technicalCommittee.proposalOf(hash)).pipe(
      mapRx((proposal) => {
        if (proposal.isNone) {
          return `New Technical Committee proposal ${hash}`;
        } else {
          const { args, section, method } = proposal.unwrap();

          return `New Technical Committee proposal ${section}::${method}(${JSON.stringify(
            args
          )})`;
        }
      })
    );
  }),

  // Techinal Committee member added
  checkMap(
    both(
      technicalCommitteeMembershipEvent("MemberAdded"),
      technicalCommitteeMembershipTx("addMember")
    ),
    ({
      tx: {
        args: [member],
      },
    }) => of(`New technical committee member added: ${member.toString()}`)
  ),

  // Techinal Committee member removed
  checkMap(
    both(
      technicalCommitteeMembershipEvent("MemberRemoved"),
      technicalCommitteeMembershipTx("removeMember")
    ),
    ({
      tx: {
        args: [member],
      },
    }) => of(`Technical committee member removed: ${member.toString()}`)
  ),
];

const logTx = ({ tx, rootTx, events, block }) => {
  let msg = `In block #${block.block.header.number} `;
  const signer =
    rootTx?.signature?.signer?.toString() || rootTx?.signer?.toString();

  if (signer) {
    msg += `from ${signer}: `;
  } else {
    msg += `unsigned: `;
  }
  msg += `${tx.method.section || tx.section}::${tx.method.method || tx.method}`;

  timestampLogger.log(
    msg,
    events.map((e) => `${e.section}::${e.method}`)
  );
};

/**
 *
 * Builds a function to flatten nested extrinsics and combine them with the corresponding events.
 * @param {DockAPI} dock
 * @returns {function(*):*}
 *
 * @todo rewrite as a visitor
 */
const createTxWithEventsCombinator = (dock) => {
  const BATCH = 1;
  const SUDO = 0b10;
  const SUDO_AS = 0b100;

  /**
   * Contains extrinsic combined with their corresponding events and next events to be combined with the next extrinsic.
   */
  class TxWithEventsAccumulator {
    constructor(extrinsics, nextEvents) {
      this.extrinsics = extrinsics;
      this.nextEvents = nextEvents;
    }

    appendExtrinsics(extrinsics) {
      return new TxWithEventsAccumulator(
        this.extrinsics.concat(extrinsics),
        this.nextEvents
      );
    }

    prependExtrinsics(extrinsics) {
      return new TxWithEventsAccumulator(
        extrinsics.concat(this.extrinsics),
        this.nextEvents
      );
    }
  }

  const { BatchCompleted, BatchInterrupted, ItemCompleted } =
    dock.api.events.utility;
  const { Sudid, SudoAsDone } = dock.api.events.sudo;

  /**
   * Picks events for the given returning `TxWithEventsAccumulator` initialized with the given extrinsic merged with their events,
   * and remaining events to be processed.
   *
   * @param {Array<*>} events
   * @param {*} tx
   * @param {{config: number, rootTx: *}} param2
   * @returns
   */
  const pickEventsForExtrinsic = (events, tx, { config, rootTx }) => {
    let batchIdx = -1,
      sudoIdx = -1,
      sudoAsIdx = -1;
    if (config & BATCH) {
      batchIdx = findIndex(
        anyPass([ItemCompleted.is, BatchCompleted.is, BatchInterrupted.is]),
        events
      );
      if (~batchIdx && ItemCompleted.is(events[batchIdx])) {
        batchIdx++;
      }
    }
    sudoIdx = findIndex(Sudid.is, events);
    sudoAsIdx = findIndex(SudoAsDone.is, events);
    if (config & SUDO && ~sudoIdx) {
      sudoIdx++;
    }
    if (config & SUDO_AS && ~sudoAsIdx) {
      sudoAsIdx++;
    }

    const minIdx = Math.min(
      events.length,
      ...[batchIdx, sudoIdx, sudoAsIdx].filter((idx) => ~idx)
    );
    const [curEvents, nextEvents] = splitAt(minIdx, events);

    return new TxWithEventsAccumulator(
      [{ events: curEvents, tx, rootTx }],
      nextEvents
    );
  };

  const isBatch = o(
    txByMethodFilter("utility", ["batch", "batchAll"]),
    assoc("tx", __, {})
  );
  const isSudo = o(
    txByMethodFilter("sudo", ["sudo", "sudoUncheckedWeight"]),
    assoc("tx", __, {})
  );
  const isSudoAs = o(txByMethodFilter("sudo", "sudoAs"), assoc("tx", __, {}));

  /**
   * Recursively merges extrinsics with their corresponding events.
   */
  const mergeEventsWithExtrs = cond([
    [
      flip(isBatch),
      (events, tx, { rootTx, config }) => {
        const acc = addIndex(reduce)(
          ({ extrinsics, nextEvents }, tx) =>
            mergeEventsWithExtrs(nextEvents, tx, {
              config: config | BATCH,
              rootTx,
            }).prependExtrinsics(extrinsics),
          new TxWithEventsAccumulator([], events),
          tx.args[0]
        );

        const selfAcc = pickEventsForExtrinsic(acc.nextEvents, tx, {
          config,
          rootTx,
        });

        if (BatchCompleted.is(head(acc.nextEvents))) {
          return selfAcc.prependExtrinsics(acc.extrinsics);
        } else {
          if (!BatchInterrupted.is(head(acc.nextEvents))) {
            throw new Error(`Invalid event: ${head(acc.nextEvents)}`);
          }

          return selfAcc.prependExtrinsics(
            acc.extrinsics.slice(0, acc.nextEvents[0].toJSON().data[0])
          );
        }
      },
    ],
    [
      flip(isSudo),
      (events, tx, { rootTx, config }) => {
        const acc = mergeEventsWithExtrs(events, tx.args[0], {
          config: config | SUDO,
          rootTx,
        });
        const selfAcc = pickEventsForExtrinsic(acc.nextEvents, tx, {
          config,
          rootTx,
        });

        return selfAcc.prependExtrinsics(acc.extrinsics);
      },
    ],
    [
      flip(isSudoAs),
      (events, tx, { rootTx, config }) => {
        const acc = mergeEventsWithExtrs(events, tx.args[1], {
          config: config | SUDO_AS,
          rootTx,
        });
        const selfAcc = pickEventsForExtrinsic(acc.nextEvents, tx, {
          config,
          rootTx,
        });

        return selfAcc.prependExtrinsics(acc.extrinsics);
      },
    ],
    [T, pickEventsForExtrinsic],
  ]);

  return mergeEventsWithExtrs;
};

main(dock, StartBlock)
  .then(() => process.exit(0))
  .catch((err) => {
    timestampLogger.error(err);
    process.exit(1);
  });
