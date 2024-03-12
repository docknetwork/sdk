import {
  BDDT16Credential,
  BDDT16CredentialBuilder,
} from '@docknetwork/crypto-wasm-ts/';

import { Bls12381BDDT16MacDockName } from './constants';

import DockCryptoSignature from './common/DockCryptoSignature';
import Bls12381BDDT16KeyPairDock2024 from './Bls12381BDDT16KeyPairDock2024';

/**
 * A BBS signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BDDT16MACDock2024 extends DockCryptoSignature {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      {
        ...options,
        signer:
          options.signer
          || Bls12381BDDT16MACDock2024.signerFactory(
            options.keypair,
            options.verificationMethod,
          ),
      },
      Bls12381BDDT16MacDockName,
      Bls12381BDDT16KeyPairDock2024,
      'https://ld.dock.io/security/bddt16/v1',
    );
  }

  static paramGenerator() {
    return this.KeyPair.SignatureParams.getMacParamsOfRequiredSize;
  }
}

Bls12381BDDT16MACDock2024.KeyPair = Bls12381BDDT16KeyPairDock2024;
Bls12381BDDT16MACDock2024.CredentialBuilder = BDDT16CredentialBuilder;
Bls12381BDDT16MACDock2024.Credential = BDDT16Credential;
Bls12381BDDT16MACDock2024.proofType = [
  Bls12381BDDT16MacDockName,
  `sec:${Bls12381BDDT16MacDockName}`,
  `https://w3id.org/security#${Bls12381BDDT16MacDockName}`,
];
