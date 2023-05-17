import {
  BBSKeypair,
  BBSSignature,
  BBSPublicKey,
  BBSSecretKey,
  BBSSignatureParams,
} from "@docknetwork/crypto-wasm-ts";

import { BBS_SIGNATURE_PARAMS_LABEL_BYTES } from "@docknetwork/crypto-wasm-ts/lib/anonymous-credentials";

import { Bls12381BBS23DockVerKeyName } from "./constants";
import DockCryptoKeyPair from "./common/DockCryptoKeyPair";

export default class Bls12381BBSKeyPairDock2023 extends DockCryptoKeyPair {
  constructor(options) {
    super(options, Bls12381BBS23DockVerKeyName);
  }

  static generate({ seed, params, controller, id, msgCount = 1 } = {}) {
    const keypair = BBSKeypair.generate(
      params ||
        BBSSignatureParams.getSigParamsOfRequiredSize(
          msgCount,
          BBS_SIGNATURE_PARAMS_LABEL_BYTES
        ),
      seed
    );
    return new Bls12381BBSKeyPairDock2023({ keypair, controller, id });
  }

  static signerFactory(key) {
    return super.signerFactory(
      key,
      BBSSecretKey,
      BBSSignatureParams,
      BBSSignature,
      BBS_SIGNATURE_PARAMS_LABEL_BYTES
    );
  }

  static verifierFactory(key) {
    return super.verifierFactory(
      key,
      BBSPublicKey,
      BBSSignatureParams,
      BBSSignature,
      BBS_SIGNATURE_PARAMS_LABEL_BYTES
    );
  }
}
