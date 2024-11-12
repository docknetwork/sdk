import { BBDT16Credential, BBDT16CredentialBuilder } from '../../crypto';

import { Bls12381BBDT16MacDockName } from './constants';

import DockCryptoSignature from './common/DockCryptoSignature';
import Bls12381BBDT16KeyPairDock2024 from './Bls12381BBDT16KeyPairDock2024';

/**
 * A BBDT16 signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBDT16MACDock2024 extends DockCryptoSignature {
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
          || Bls12381BBDT16MACDock2024.signerFactory(
            options.keypair,
            options.verificationMethod,
          ),
      },
      Bls12381BBDT16MacDockName,
      Bls12381BBDT16KeyPairDock2024,
      'https://ld.dock.io/security/bbdt16/v1',
    );
  }

  static get paramGenerator() {
    return this.KeyPair.SignatureParams.getMacParamsOfRequiredSize;
  }
}

Bls12381BBDT16MACDock2024.KeyPair = Bls12381BBDT16KeyPairDock2024;
Bls12381BBDT16MACDock2024.CredentialBuilder = BBDT16CredentialBuilder;
Bls12381BBDT16MACDock2024.Credential = BBDT16Credential;
Bls12381BBDT16MACDock2024.proofType = [
  Bls12381BBDT16MacDockName,
  `sec:${Bls12381BBDT16MacDockName}`,
  `https://w3id.org/security#${Bls12381BBDT16MacDockName}`,
];
