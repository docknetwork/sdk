import {
  BDDT16_MAC_PARAMS_LABEL_BYTES, BDDT16KeypairG1, BDDT16MacPublicKeyG1,
  BDDT16Mac, BDDT16MacParams, BDDT16MacSecretKey,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381BDDT16DockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381BDDT16KeyPairDock2024 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381BDDT16DockVerKeyName);
  }

  static get paramGenerator() {
    return this.SignatureParams.getMacParamsOfRequiredSize;
  }
}

Bls12381BDDT16KeyPairDock2024.SecretKey = BDDT16MacSecretKey;
Bls12381BDDT16KeyPairDock2024.PublicKey = BDDT16MacPublicKeyG1;
Bls12381BDDT16KeyPairDock2024.SignatureParams = BDDT16MacParams;
Bls12381BDDT16KeyPairDock2024.Signature = BDDT16Mac;
Bls12381BDDT16KeyPairDock2024.KeyPair = BDDT16KeypairG1;
Bls12381BDDT16KeyPairDock2024.defaultLabelBytes = BDDT16_MAC_PARAMS_LABEL_BYTES;
