import {
  BBSKeypair,
  BBSSignature,
  BBSPublicKey,
  BBSSecretKey,
  BBSSignatureParams,
  BBS_SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381BBS23DockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381BBSKeyPairDock2023 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381BBS23DockVerKeyName);
  }
}

Bls12381BBSKeyPairDock2023.SecretKey = BBSSecretKey;
Bls12381BBSKeyPairDock2023.PublicKey = BBSPublicKey;
Bls12381BBSKeyPairDock2023.SignatureParams = BBSSignatureParams;
Bls12381BBSKeyPairDock2023.Signature = BBSSignature;
Bls12381BBSKeyPairDock2023.KeyPair = BBSKeypair;
Bls12381BBSKeyPairDock2023.defaultLabelBytes = BBS_SIGNATURE_PARAMS_LABEL_BYTES;
