import {
  BBSPlusKeypairG2,
  BBSPlusSignatureG1,
  BBSPlusSecretKey,
  BBSPlusSignatureParamsG1,
  BBSPlusPublicKeyG2,
  BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381BBSDockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381G2KeyPairDock2022 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381BBSDockVerKeyName);
  }
}

Bls12381G2KeyPairDock2022.SecretKey = BBSPlusSecretKey;
Bls12381G2KeyPairDock2022.PublicKey = BBSPlusPublicKeyG2;
Bls12381G2KeyPairDock2022.SignatureParams = BBSPlusSignatureParamsG1;
Bls12381G2KeyPairDock2022.Signature = BBSPlusSignatureG1;
Bls12381G2KeyPairDock2022.KeyPair = BBSPlusKeypairG2;
Bls12381G2KeyPairDock2022.defaultLabelBytes = BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES;
