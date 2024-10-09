// Error class for passing extrinsic errors upstream
export class ExtrinsicEventError extends Error {
  constructor(message, method, data, status, events) {
    super(message);
    this.name = 'ExtrinsicEventError';
    this.method = method;
    this.data = data;
    this.status = status;
    this.events = events;
  }
}

export class ExtrinsicDispatchError extends Error {
  constructor(message, status, dispatchError) {
    super(message);
    this.name = 'ExtrinsicDispatchError';
    this.status = status;
    this.dispatchError = dispatchError;
  }
}

/**
 * Attempts to find extrinsic with the given hash across the blocks with the supplied numbers.
 * Returns the found block in case of success.
 * **This method will concurrently request all candidate blocks at the same time.**
 * @param {BlocksProvider}
 * @param {Iterable<number>} blockNumbers
 * @param {Uint8Array|string} txHash
 * @returns {?object}
 */
export const findExtrinsicBlock = async (
  blocksProvider,
  blockNumbers,
  txHash,
  // eslint-disable-next-line no-async-promise-executor
) => await new Promise(async (resolve, reject) => {
  try {
    await Promise.all(
      [...new Set(blockNumbers)].map(async (number) => {
        const block = await blocksProvider.blockByNumber(number);

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
 * Extracts extrinsic error from the supplied event data.
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
  // Ensure `ExtrinsicFailed` event doesnt exist
  for (let i = 0; i < events.length; i++) {
    const {
      event: { data: eventData, method },
    } = events[i].toJSON();

    if (method === 'ExtrinsicFailed' || method === 'BatchInterrupted') {
      const errorMsg = errorMsgFromEventData(api, eventData);
      throw new ExtrinsicEventError(
        errorMsg,
        method,
        eventData,
        status,
        events,
      );
    }
  }
};
