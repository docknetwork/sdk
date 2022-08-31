import {
  equals,
  includes,
  lensProp,
  find,
  curry,
  all,
  allPass,
  filter,
  reduce,
  F,
  splitAt,
  prop,
  assoc,
  view,
  either,
  __,
  last,
  pipe,
  o,
  when,
  always,
  isEmpty,
  both,
  complement,
  isNil,
  converge,
  ifElse,
  identity,
  findIndex,
  any,
  unless,
  difference,
  curryN,
  defaultTo,
  head,
} from "ramda";
import {
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
  concat,
  bufferTime,
  pluck,
  takeUntil,
  take,
  switchMap,
  ReplaySubject,
} from "rxjs";
import { envObj, formatDock, notNilAnd, withDockAPI } from "./helpers";
import { sendAlarmEmailHtml } from "./email_utils";

const {
  TxWatcherAlarmEmailTo,
  FullNodeEndpoint,
  LogLevel,
  BaseBlockExplorerUrl,
  BaseExtrinsicExplorerUrl,
} = envObj({
  TxWatcherAlarmEmailTo: notNilAnd(String),
  FullNodeEndpoint: notNilAnd(String),
  LogLevel: unless(
    isNil,
    unless(includes(__, ["debug"]), () => {
      throw new Error('Allowed options: ["debug"]');
    })
  ),
  BaseBlockExplorerUrl: defaultTo("https://dock.subscan.io/block"),
  BaseExtrinsicExplorerUrl: defaultTo("https://dock.subscan.io/extrinsic"),
});

const main = async (dock, startBlock) => {
  const { ExtrinsicFailed } = dock.api.events.system;
  const mergeEventsWithExtrs = createEventsWithExtrsCombinator(dock);

  // Emits recently created blocks
  const currentBlocks$ = new Observable((sub) => {
    dock.api.derive.chain.subscribeNewBlocks((block) => {
      sub.next(block);
    });
  });

  // Emits blocks starting from the specified number
  const previousBlocks$ =
    startBlock != null
      ? defer(() => {
          const source = defer(() => of(startBlock++)).pipe(
            concatMap((number) =>
              of(number).pipe(
                concatMap((number) =>
                  from(dock.api.rpc.chain.getBlockHash(number))
                ),
                concatMap((hash) => from(dock.api.derive.chain.getBlock(hash))),
                takeUntil(
                  currentBlocks$.pipe(
                    filterRx(
                      (block) => block.block.header.number.toNumber() <= number
                    )
                  )
                )
              )
            ),
            concatMap((value) => concat(of(value), source))
          );

          return source;
        })
      : EMPTY;

  const blocks$ = concat(previousBlocks$, currentBlocks$);

  // Flattens extrinsics returning transaction along with produced events
  const txs$ = blocks$
    .pipe(
      concatMap((block) =>
        from(
          block.extrinsics.flatMap(({ extrinsic, events }) => {
            return ExtrinsicFailed.is(last(events))
              ? []
              : mergeEventsWithExtrs(events, extrinsic, {
                  rootTx: extrinsic,
                  config: 0,
                }).extrinsics;
          })
        ).pipe(mapRx(assoc("block", block)))
      )
    )
    .pipe(share());
  // Each event repeats its transaction
  const events$ = txs$.pipe(
    concatMap(({ events, ...rest }) =>
      from(events).pipe(mapRx((event) => ({ event, events, ...rest })))
    )
  );

  // Applies filters to the given observable
  const applyFilters = curry((buildFilters, data$) => {
    const handleItem = withExtrinsicUrl(converge(merge, buildFilters(dock)));

    return data$.pipe(concatMap((item) => handleItem(item, dock)));
  });

  const res$ = merge(
    txs$.pipe(
      tap(LogLevel === "debug" ? logTx : identity),
      applyFilters(txFilters)
    ),
    events$.pipe(applyFilters(eventFilters))
  ).pipe(
    batchNotifications(3e3),
    tap((email) => console.log("Sending email: ", email)),
    concatMap(
      o(
        from,
        sendAlarmEmailHtml(
          TxWatcherAlarmEmailTo,
          "Dock blockchain alarm notification"
        )
      )
    )
  );

  await new Promise((resolve, reject) =>
    res$.subscribe({ complete: () => resolve(null), error: reject })
  );
};

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
 * Represents added/removed difference between new data and old data.
 */
class Diff {
  constructor(newData, oldData) {
    this.added = difference(newData, oldData);
    this.removed = difference(oldData, newData);
  }

  empty() {
    return new Diff([], []);
  }
}

/**
 * Accumulates differences.
 */
class DiffAccumulator {
  constructor(init) {
    this.last = init;
  }

  handle(data) {
    this.diff =
      this.last != null ? new Diff(data, this.last) : Diff.prototype.empty();
    this.last = data;

    return this;
  }
}

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
 * Filters extrinsics by its `section`/`method`.
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
  filter(methodFilter("sudo", "Sudid")),
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
  either(complement(anyEventByMethodFilter("sudo", "Sudid")), isValidSudo),
  complement(
    either(
      anyEventByMethodFilter("utility", "BatchInterrupted"),
      anyEventByMethodFilter("system", "ExtrinsicFailed")
    )
  )
);
/**
 * Filters successful extrinsics by its `section`/`method`.
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
/**
 * Filter extrinsics from `technicalCommitteeMembership` pallet.
 */
const technicalCommitteeMembershipTx = successfulTxByMethodFilter(
  "technicalCommitteeMembership"
);

const txFilters = () => [
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

const eventFilters = (dock) => {
  // Emits latest council diff accumulator
  const councilDiffAccumulator = new ReplaySubject(1);
  councilDiffAccumulator.next(null);

  return [
    // Democracy proposal
    checkMap(
      both(democracyEvent("Proposed"), democracyTx("propose")),
      ({
        tx: {
          args: [hash],
        },
      }) => of(`New Democracy proposal ${hash}`)
    ),

    // Democracy preimage noted for the proposal
    checkMap(
      both(democracyEvent("PreimageNoted"), democracyTx("notePreimage")),
      (
        {
          event: {
            data: [proposalHash],
          },
          tx: {
            args: [preimage],
          },
        },
        dock
      ) => {
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

    // Democracy proposal fast-tracked
    checkMap(
      both(democracyTx("fastTrack"), democracyEvent("Started")),
      ({
        tx: {
          args: [proposalHash],
        },
      }) => of(`Proposal is fast-tracked: ${proposalHash.toString()}`)
    ),

    // Council proposal
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
        block,
      }) =>
        councilDiffAccumulator.pipe(
          take(1),
          switchMap((acc) => {
            if (acc == null) {
              return from(
                dock.api.rpc.chain.getBlockHash(
                  block.block.header.number.toNumber() - 1
                )
              ).pipe(
                switchMap((blockHash) =>
                  dock.api.query.council.members.at(blockHash)
                ),
                mapRx((data) => new DiffAccumulator(data.toJSON()))
              );
            } else {
              return of(acc);
            }
          }),
          mapRx((acc) => {
            const newDiff = acc.handle(newMembers.toJSON().map(head));
            councilDiffAccumulator.next(newDiff);

            return newDiff;
          }),
          pluck("diff"),
          filterRx(complement(isEmpty)),
          mapRx(
            ({ added, removed }) =>
              `Council membership changed. Members added: ${
                added.join(",") || "none"
              }, members removed: ${removed.join(",") || "none"}`
          )
        )
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
      }) => of(`New technical committee member added: ${member}`)
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
      }) => of(`Technical committee member removed: ${member}`)
    ),
  ];
};

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

  console.log(
    msg,
    events.map((e) => `${e.section}::${e.method}`)
  );
};

const createEventsWithExtrsCombinator = (dock) => {
  const BATCH = 1;
  const SUDO = 2;

  class TxWithEventsAccumulator {
    constructor(extrinsics, events) {
      this.extrinsics = extrinsics;
      this.events = events;
    }

    appendExtrinsics(extrinsics) {
      return new TxWithEventsAccumulator(
        this.extrinsics.concat(extrinsics),
        this.events
      );
    }

    prependExtrinsics(extrinsics) {
      return new TxWithEventsAccumulator(
        extrinsics.concat(this.extrinsics),
        this.events
      );
    }
  }

  const { BatchCompleted, BatchInterrupted } = dock.api.events.utility;
  const { Sudid } = dock.api.events.sudo;

  const findTx = find((entities) => {
    const entity = entities?.[0];

    return (
      entity &&
      entity.method &&
      entity.section &&
      entity.args &&
      entity.callIndex
    );
  });

  const txWithEvents = (events, tx, { config: config, rootTx }) => {
    if (config & BATCH) {
      let idx = findIndex(
        either(BatchCompleted.is, BatchInterrupted.is),
        events
      );
      if (idx === -1) {
        idx = events.length;
      }

      const [curEvents, nextEvents] = splitAt(idx, events);

      return new TxWithEventsAccumulator(
        [{ events: curEvents, tx, rootTx }],
        nextEvents
      );
    } else if (config & SUDO) {
      let idx = findIndex(Sudid.is, events);
      if (idx === -1) {
        idx = events.length - 1;
      }

      const [curEvents, nextEvents] = splitAt(idx + 1, events);

      return new TxWithEventsAccumulator(
        [{ events: curEvents, tx, rootTx }],
        nextEvents
      );
    }

    return new TxWithEventsAccumulator([{ events, tx, rootTx }], []);
  };

  /**
   * Merges extrinsic with its events
   */
  const mergeEventsWithExtrs = ifElse(
    (_, tx) => findTx([tx.args, tx.args?.[0]]),
    (events, tx, { rootTx, config }) => {
      const isBatch = txByMethodFilter("utility", ["batch", "batchAll"])({
        tx,
      });

      if (isBatch) {
        const acc = reduce(
          ({ extrinsics, events }, tx) => {
            const merged = mergeEventsWithExtrs(events, tx, {
              config: config | BATCH,
              rootTx,
            });

            return merged.prependExtrinsics(extrinsics);
          },
          new TxWithEventsAccumulator([], events),
          tx.args[0]
        );

        const selfAcc = txWithEvents(acc.events, tx, {
          config: config,
          rootTx,
        });

        return BatchCompleted.is(head(acc.events))
          ? selfAcc.prependExtrinsics(acc.extrinsics)
          : selfAcc.prependExtrinsics(
              acc.extrinsics.slice(0, acc.events[0].toJSON().data[0])
            );
      } else {
        const isSudo = txByMethodFilter("sudo", [
          "sudo",
          "sudoUncheckedWeight",
        ])({ tx });

        const acc = mergeEventsWithExtrs(events, tx.args[0], {
          config: config | (isSudo ? SUDO : 0),
          rootTx,
        });
        const selfAcc = txWithEvents(acc.events, tx, {
          config: config,
          rootTx,
        });

        return selfAcc.prependExtrinsics(acc.extrinsics);
      }
    },
    txWithEvents
  );

  return mergeEventsWithExtrs;
};

withDockAPI({ address: FullNodeEndpoint }, main)()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
