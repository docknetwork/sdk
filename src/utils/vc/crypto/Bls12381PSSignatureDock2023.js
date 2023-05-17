import {
  PS_SIGNATURE_PARAMS_LABEL_BYTES,
  PSCredentialBuilder,
} from "@docknetwork/crypto-wasm-ts/lib/anonymous-credentials";

import {
  PSSignature,
  PSSecretKey,
  PSSignatureParams,
} from "@docknetwork/crypto-wasm-ts";

import { Bls12381PSSigDockSigName } from "./constants";

import Bls12381PSKeyPairDock2023 from "./Bls12381PSKeyPairDock2023";
import DockCryptoSignature from "./common/DockCryptoSignature";

/**
 * A PS signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381PSSignatureDock2023 extends DockCryptoSignature {
  static proofType = [
    Bls12381PSSigDockSigName,
    `sec:${Bls12381PSSigDockSigName}`,
    `https://w3id.org/security#${Bls12381PSSigDockSigName}`,
  ];

  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      { ...options, signer: options.signer ?? Bls12381PSSignatureDock2023.signerFactory(options.keypair, options.verificationMethod) },
      Bls12381PSSigDockSigName,
      Bls12381PSKeyPairDock2023,
      "https://ld.dock.io/security/ps/v1"
    );
  }

  /**
   * @param {object} options - The options to use.
   * @param {object} options.document - The document to be signed/verified.
   * @param {object} options.proof - The proof to be verified.
   * @param {function} options.documentLoader - The document loader to use.
   * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
   *
   * @returns {Promise<{Uint8Array}>}.
   */
  async createVerifyData(options) {
    return super.createVerifyData(options, PS_SIGNATURE_PARAMS_LABEL_BYTES);
  }

  static convertCredential(credential) {
    return super.convertCredential(
      credential,
      Bls12381PSSigDockSigName,
      PSCredentialBuilder
    );
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @param verificationMethod
   * @returns {object}
   */
  static signerFactory(keypair, verificationMethod) {
    return super.signerFactory(
      keypair,
      verificationMethod,
      PSSecretKey,
      PSSignatureParams,
      PSSignature,
      PS_SIGNATURE_PARAMS_LABEL_BYTES,
      { prepareSecretKey: Bls12381PSKeyPairDock2023.adapatKey }
    );
  }
}
