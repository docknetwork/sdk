import {
  BBSPlusKeypairG2,
  BBSPlusSignatureG1,
  BBSPlusPublicKeyG2,
  BBSPlusSecretKey,
  BBSPlusSignatureParamsG1,
  BBSPlusSignatureParamsG2,
} from '@docknetwork/crypto-wasm-ts';

import {
  BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import { Bls12381BBSDockVerKeyName } from './constants';
import DockCryptoKeyPair from './common/DockCryptoKeyPair';

export default class Bls12381G2KeyPairDock2022 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381BBSDockVerKeyName);
  }

  static generate({
    seed, params, controller, id, msgCount = 1,
  } = {}) {
    const keypair = BBSPlusKeypairG2.generate(params || BBSPlusSignatureParamsG1.getSigParamsOfRequiredSize(msgCount, BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES), seed);
    return new Bls12381G2KeyPairDock2022({ keypair, controller, id });
  }

  static signerFactory(key) {
    return super.signerFactory(
      key,
      BBSPlusSecretKey,
      BBSPlusSignatureParamsG2,
      BBSPlusSignatureG1,
      BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES,
    );
  }

  static verifierFactory(key) {
    return super.verifierFactory(
      key,
      BBSPlusPublicKeyG2,
      BBSPlusSignatureParamsG1,
      BBSPlusSignatureG1,
      BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES,
    );
  }
}
