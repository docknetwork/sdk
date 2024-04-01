import ExtrinsicError from '../errors/extrinsic-error';

/**
 * Attempts to find extrinsic with the given hash across the blocks with the supplied numbers.
 * Returns the found block in case of success.
 * **This method will concurrently request all candidate blocks at the same time.**
 *
 * @param {ApiPromise} api
 * @param {Iterable<number>} blockNumbers
 * @param {Uint8Array|string} txHash
 * @returns {?object}
 */
// eslint-disable-next-line no-async-promise-executor
export const findExtrinsicBlock = async (api, blockNumbers, txHash) => await new Promise(async (resolve, reject) => {
  try {
    await Promise.all(
      [...blockNumbers].map(async (number) => {
        const blockHash = await api.rpc.chain.getBlockHash(number);
        const block = await api.derive.chain.getBlock(blockHash);

        const found = block.block.extrinsics.some(
          (extr) => String(extr.hash) === String(txHash),
        );

        if (found) {
          resolve(block);
        }
      }),
    );

    resolve(null);
  } catch (err) {
    reject(err);
  }
});

/**
 * Extracts error from the supplied event data.
 *
 * @param {*} api
 * @param {*} data
 * @returns {string}
 */
export function errorMsgFromEventData(api, eventData) {
  // Loop through each of the parameters
  // trying to find module error information
  let errorMsg = 'Extrinsic failed submission:';
  eventData.forEach((error) => {
    if (error.isModule) {
      // for module errors, we have the section indexed, lookup
      try {
        const decoded = api.registry.findMetaError(error.asModule);
        const { docs, method, section } = decoded;
        errorMsg += `\n${section}.${method}: ${docs.join(' ')}`;
      } catch (e) {
        errorMsg += `\nError at module index: ${error.asModule.index} Error: ${error.asModule.error}`;
      }
    } else {
      const errorStr = error.toString();
      if (errorStr !== '0') {
        errorMsg += `\n${errorStr}`; // Other, CannotLookup, BadOrigin, no extra info
      }
    }
  });
  return errorMsg;
}

/**
 * Checks supplied events and in case either of them indicates transaction failure, throws an error.
 *
 * @param {*} api
 * @param {*} events
 * @param {*} status
 */
export const ensureExtrinsicSucceeded = (api, events, status) => {
  // Ensure ExtrinsicFailed event doesnt exist
  for (let i = 0; i < events.length; i++) {
    const {
      event: { data: eventData, method },
    } = events[i];
    if (method === 'ExtrinsicFailed' || method === 'BatchInterrupted') {
      const errorMsg = errorMsgFromEventData(api, eventData);
      throw new ExtrinsicError(errorMsg, method, eventData, status, events);
    }
  }
};
