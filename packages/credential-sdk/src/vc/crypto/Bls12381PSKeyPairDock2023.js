import {
  PSKeypair,
  PSSignature,
  PSPublicKey,
  PSSecretKey,
  PSSignatureParams,
  PS_SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381PSDockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381PSKeyPairDock2023 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381PSDockVerKeyName);
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

Bls12381PSKeyPairDock2023.SecretKey = PSSecretKey;
Bls12381PSKeyPairDock2023.PublicKey = PSPublicKey;
Bls12381PSKeyPairDock2023.SignatureParams = PSSignatureParams;
Bls12381PSKeyPairDock2023.Signature = PSSignature;
Bls12381PSKeyPairDock2023.KeyPair = PSKeypair;
Bls12381PSKeyPairDock2023.defaultLabelBytes = PS_SIGNATURE_PARAMS_LABEL_BYTES;
