import {
  BBS_SIGNATURE_PARAMS_LABEL_BYTES,
  BBSCredentialBuilder,
} from "@docknetwork/crypto-wasm-ts/lib/anonymous-credentials";

import {
  BBSSignature,
  BBSSecretKey,
  BBSSignatureParams,
} from "@docknetwork/crypto-wasm-ts";

import { Bls12381BBS23SigDockSigName } from "./constants";

import Bls12381BBSKeyPairDock2023 from "./Bls12381BBSKeyPairDock2023";
import DockCryptoSignature from "./common/DockCryptoSignature";

/**
 * A BBS signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBSSignatureDock2023 extends DockCryptoSignature {
  static proofType = [
    Bls12381BBS23SigDockSigName,
    `sec:${Bls12381BBS23SigDockSigName}`,
    `https://w3id.org/security#${Bls12381BBS23SigDockSigName}`,
  ];

  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      { ...options, signer: options.signer ?? Bls12381BBSSignatureDock2023.signerFactory(options.keypair, options.verificationMethod) },
      Bls12381BBS23SigDockSigName,
      Bls12381BBSKeyPairDock2023,
      "https://ld.dock.io/security/bbs23/v1"
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
    return super.createVerifyData(options, BBS_SIGNATURE_PARAMS_LABEL_BYTES);
  }

  static convertCredential(credential) {
    return super.convertCredential(
      credential,
      Bls12381BBS23SigDockSigName,
      BBSCredentialBuilder
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
      BBSSecretKey,
      BBSSignatureParams,
      BBSSignature,
      BBS_SIGNATURE_PARAMS_LABEL_BYTES
    );
  }
}
