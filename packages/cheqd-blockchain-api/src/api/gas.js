import { maxBigInt } from '@docknetwork/credential-sdk/utils';

/**
 * Takes gas amount calculated using addition of gas amounts of every transaction included in batch and returns adjusted gas amount that corresponds to the real-world gas usage plus 20% margin.
 *
 * For referece, simple DID doc creating with 1 Ed25519 key consumes the following gas amounts:
 *
 * Pre-calculated:
 * - 1 item: 155,000
 * - 10 items: 1,550,000
 * - 25 items: 3,875,000
 * - 50 items: 7,750,000
 * - 100 items: 15,500,000
 *
 * Used:
 * - 1 item: 127,011
 * - 10 items: 508,369
 * - 25 items: 1,133,562
 * - 50 items: 2,201,925
 * - 100 items: 4,318,315
 *
 * @param {bigint|number} calculatedAmount - The calculated amount to convert
 * @param {bigint|number} itemCount - Number of items this amount is for
 * @returns {bigint} - The estimated used amount plus 20% margin
 */
/* eslint-disable sonarjs/cognitive-complexity */
export const gasAmountForBatch = (estimatedGas, itemsPerBatch) => {
  // Convert inputs to BigInt
  const estGas = BigInt(estimatedGas);
  const itemCount = BigInt(itemsPerBatch);

  let predictedGas;
  let multiplier;

  // Different prediction logic based on item count
  if (itemCount === 1n) {
    // For single items
    multiplier = 100n; // 1
  } else if (itemCount <= 10n) {
    // For 2-10 items
    if (estGas > 10000000n) {
      multiplier = 60n; // 0.5
    } else if (estGas > 4000000n) {
      multiplier = 65n; // 0.65
    } else {
      multiplier = 70n; // 0.7
    }
  } else if (itemCount <= 25n) {
    // For 11-25 items
    if (estGas > 20000000n) {
      multiplier = 15n; // 0.15
    } else if (estGas > 10000000n) {
      multiplier = 20n; // 0.2
    } else if (estGas > 4000000n) {
      multiplier = 38n; // 0.38
    } else {
      multiplier = 35n; // 0.35
    }
  } else if (itemCount <= 50n) {
    // For 26-50 items
    if (estGas > 20000000n) {
      multiplier = 27n; // 0.27
    } else if (estGas > 10000000n) {
      multiplier = 30n; // 0.3
    } else {
      multiplier = 37n; // 0.37
    }
  } else {
    // For 51+ items
    multiplier = estGas > 20000000n ? 55n : 40n; // 0.55 or 0.4
  }

  // Calculate prediction using BigInt division
  // Since we're using integers for multiplier, we need to divide by 100 after multiplication
  predictedGas = (estGas * multiplier) / 100n;

  // Add 20% buffer (multiply by 120 and divide by 100)
  predictedGas = (predictedGas * 120n) / 100n;

  return predictedGas;
};

const BASE_CREATE_DID_DOC_GAS_AMOUNT = 135000n;
const DID_DOC_OFFCHAIN_KEY_GAS_AMOUNT = 25000n;
const DID_DOC_ONCHAIN_KEY_GAS_AMOUNT = 5000n;
const DEACTIVATE_DID_DOC_GAS_AMOUNT = 100000n;
const MIN_CREATE_RESOURCE_GAS_AMOUNT = 150000n;
const RESOURCE_BYTE_GAS_AMOUNT = 500n;

/**
 * Calculates gas required to create or update a DID document
 * @param  {object} tx - Transaction JSON containing payload with assertion and verification methods
 * @returns {bigint} - Total gas amount calculated as sum of base gas plus:
 * - 25,000 per new assertion method not present in verification methods
 * - 5,000 per verification method
 */
export const createOrUpdateDIDDocGas = ({
  payload: { assertionMethod, verificationMethod },
}) => {
  const offchainKeysCost = BigInt(
    assertionMethod.filter(
      (id) => !verificationMethod.some((item) => item.id === id),
    ).length,
  ) * DID_DOC_OFFCHAIN_KEY_GAS_AMOUNT;

  const onChainKeysCost = BigInt(verificationMethod.length) * DID_DOC_ONCHAIN_KEY_GAS_AMOUNT;

  return BASE_CREATE_DID_DOC_GAS_AMOUNT + offchainKeysCost + onChainKeysCost;
};

/**
 * Returns fixed gas amount for deactivating a DID document
 * @returns {bigint} - Fixed gas amount of 100,000
 */
export const deactivateDIDDocGas = () => DEACTIVATE_DID_DOC_GAS_AMOUNT;

/**
 * Calculates gas required to create a resource
 * @param  {object} tx - Transaction JSON containing payload with data
 * @returns {bigint} - Maximum between base gas (150,000) and scaled amount (250 per byte of data)
 */
export const createResourceGas = ({ payload: { data } }) => maxBigInt(
  MIN_CREATE_RESOURCE_GAS_AMOUNT,
  RESOURCE_BYTE_GAS_AMOUNT * BigInt(data.length),
);
