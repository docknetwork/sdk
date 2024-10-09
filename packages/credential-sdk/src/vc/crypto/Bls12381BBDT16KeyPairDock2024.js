import {
  BBDT16_MAC_PARAMS_LABEL_BYTES,
  BBDT16KeypairG1,
  BBDT16MacPublicKeyG1,
  BBDT16Mac,
  BBDT16MacParams,
  BBDT16MacSecretKey,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381BBDT16DockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381BBDT16KeyPairDock2024 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381BBDT16DockVerKeyName);
  }

  static get paramGenerator() {
    return this.SignatureParams.getMacParamsOfRequiredSize;
  }
}

Bls12381BBDT16KeyPairDock2024.SecretKey = BBDT16MacSecretKey;
Bls12381BBDT16KeyPairDock2024.PublicKey = BBDT16MacPublicKeyG1;
Bls12381BBDT16KeyPairDock2024.SignatureParams = BBDT16MacParams;
Bls12381BBDT16KeyPairDock2024.Signature = BBDT16Mac;
Bls12381BBDT16KeyPairDock2024.KeyPair = BBDT16KeypairG1;
Bls12381BBDT16KeyPairDock2024.defaultLabelBytes = BBDT16_MAC_PARAMS_LABEL_BYTES;
