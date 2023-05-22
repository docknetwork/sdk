import {
  PSKeypair,
  PSSignature,
  PSPublicKey,
  PSSecretKey,
  PSSignatureParams,
} from '@docknetwork/crypto-wasm-ts';

import { PS_SIGNATURE_PARAMS_LABEL_BYTES } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import { Bls12381PSDockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381PSKeyPairDock2023 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381PSDockVerKeyName);
  }

  static generate({
    seed, params, controller, id, msgCount = 1,
  } = {}) {
    const keypair = PSKeypair.generate(
      params
        || PSSignatureParams.getSigParamsOfRequiredSize(
          msgCount,
          PS_SIGNATURE_PARAMS_LABEL_BYTES,
        ),
      seed,
    );
    return new Bls12381PSKeyPairDock2023({ keypair, controller, id });
  }

  static signerFactory(key) {
    return super.signerFactoryForSigScheme(
      key,
      PSSecretKey,
      PSSignatureParams,
      PSSignature,
      PS_SIGNATURE_PARAMS_LABEL_BYTES,
    );
  }

  static verifierFactory(key) {
    return super.verifierFactoryForSigScheme(
      key,
      PSPublicKey,
      PSSignatureParams,
      PSSignature,
      PS_SIGNATURE_PARAMS_LABEL_BYTES,
    );
  }

  /**
   * Attempts to adapt supplied key for the `msgCount` messages.
   * Throws an error if `msgCount` is greater than the supported message count.
   * @param {*} key
   * @param {*} msgCount
   */
  static adaptKey(key, msgCount) {
    const supportedMessageCount = key.supportedMessageCount();

    if (supportedMessageCount === msgCount) {
      return key;
    } else if (supportedMessageCount > msgCount) {
      return key.adaptForLess(msgCount);
    } else {
      throw new Error(
        `Failed to adapt provided key ${key} supporting ${supportedMessageCount} for ${msgCount} messages - can only adapt for less amount of messages`,
      );
    }
  }
}
