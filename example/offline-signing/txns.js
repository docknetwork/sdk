import { EXTRINSIC_VERSION } from '@polkadot/types/extrinsic/v4/Extrinsic';
import {
  createSignedTx, createSigningPayload, methods, decode,
} from '@substrate/txwrapper';

/**
 * Build a transfer txn
 * @param {Object} params - An object containing the parameters.
 * @param params.from
 * @param params.to
 * @param params.value
 * @param params.tip
 * @param params.nonce
 * @param params.eraPeriod
 * @param params.blockNumber
 * @param params.blockHash
 * @param params.registry - This is an instance of `Registry` class
 * @returns {{unsignedTxn: Object, signingPayload: string}}
 */
export function buildTransferTxn({
  from, to, value, tip, nonce, eraPeriod, blockNumber, blockHash, registry,
}) {
  const unsignedTxn = methods.balances.transfer({
    value,
    dest: to,
  }, {
    address: from,
    blockHash,
    blockNumber,
    eraPeriod,
    genesisHash: registry.chainInfo.genesis,
    metadataRpc: registry.metadata,
    nonce,
    specVersion: registry.chainInfo.specVersion,
    tip,
    transactionVersion: registry.chainInfo.transactionVersion,
  }, {
    metadataRpc: registry.metadata,
    registry: registry.registry,
  });
  const signingPayload = createSigningPayload(unsignedTxn, { registry: registry.registry });
  return {
    unsignedTxn, signingPayload,
  };
}

/**
 * @param {Object} params - An object containing the parameters.
 * @param params.keypair - The keypair used to sign. Either provide this or provide a keyring object and secret URI
 * @param params.keyring - Only considered when keypair is not passed
 * @param params.secretUri - Only considered when keypair is not passed
 * @param params.unsignedTxn - This is returned from `buildTransferTxn`.
 * @param params.signingPayload - This is returned from `buildTransferTxn`.
 * @param params.registry - This is an instance of `Registry` class
 * @returns {string} - Returns txn as hex string
 */
export function signTxn({
  keypair, keyring, secretUri, unsignedTxn, signingPayload, registry,
}) {
  let signingKeypair = keypair;
  // Create a keypair if not already provided using given keyring and secret URI
  if (signingKeypair === undefined) {
    if (keyring === undefined || secretUri === undefined) {
      throw new Error('Either pass a keypair or pass both keyring and a secret URI');
    }
    keyring.setSS58Format(registry.chainInfo.ss58Format);
    signingKeypair = keyring.addFromUri(secretUri);
  }

  const { signature } = registry.registry.createType('ExtrinsicPayload', signingPayload, { version: EXTRINSIC_VERSION }).sign(signingKeypair);

  return createSignedTx(unsignedTxn, signature, registry.optionsMeta);
}

export function decodeSignedTxn(signedTxn, registry) {
  return decode(signedTxn, registry.optionsMeta, true);
}
