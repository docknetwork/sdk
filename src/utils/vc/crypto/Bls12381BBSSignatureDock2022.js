import {
  BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES,
  BBSPlusCredentialBuilder,
} from "@docknetwork/crypto-wasm-ts/lib/anonymous-credentials";

import {
  BBSPlusSignatureG1,
  BBSPlusSecretKey,
  BBSPlusSignatureParamsG1,
} from "@docknetwork/crypto-wasm-ts";

import { Bls12381BBSSigDockSigName } from "./constants";

import Bls12381G2KeyPairDock2022 from "./Bls12381G2KeyPairDock2022";
import DockCryptoSignature from "./common/DockCryptoSignature";

/**
 * A BBSPlus signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBSSignatureDock2022 extends DockCryptoSignature {
  static proofType = [
    Bls12381BBSSigDockSigName,
    `sec:${Bls12381BBSSigDockSigName}`,
    `https://w3id.org/security#${Bls12381BBSSigDockSigName}`,
  ];

  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      { ...options, signer: options.signer ?? Bls12381BBSSignatureDock2022.signerFactory(options.keypair, options.verificationMethod) },
      Bls12381BBSSigDockSigName,
      Bls12381G2KeyPairDock2022,
      "https://ld.dock.io/security/bbs/v1"
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
    return super.createVerifyData(
      options,
      BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES
    );
  }

  static convertCredential(credential) {
    return super.convertCredential(
      credential,
      Bls12381BBSSigDockSigName,
      BBSPlusCredentialBuilder
    );
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @param verificationMethod
   * @returns {object}
   */
  static signerFactory(keypair, verificationMethod) {
    return super.signerFactoryForSigScheme(
      keypair,
      verificationMethod,
      BBSPlusSecretKey,
      BBSPlusSignatureParamsG1,
      BBSPlusSignatureG1,
      BBS_PLUS_SIGNATURE_PARAMS_LABEL_BYTES
    );
  }
}
