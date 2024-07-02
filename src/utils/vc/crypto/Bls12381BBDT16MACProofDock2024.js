import {
  Bls12381BBDT16MacProofDockName, Bls12381BBDT16MacDockName,
} from './constants';

import DockCryptoSignatureProof from './common/DockCryptoSignatureProof';
import Bls12381BBDT16KeyPairDock2024 from './Bls12381BBDT16KeyPairDock2024';
import Bls12381BBDT16MACDock2024 from './Bls12381BBDT16MACDock2024';

/**
 * A BBDT16 signature suite for use with derived BBDT16 credentials aka BBDT16 presentations
 */
export default class Bls12381BBDT16MACProofDock2024 extends DockCryptoSignatureProof {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      options,
      Bls12381BBDT16MacProofDockName,
      Bls12381BBDT16KeyPairDock2024,
      'https://ld.dock.io/security/bbdt16/v1',
    );
  }

  /**
   *
   * @param _
   * @returns {Promise<void>} - Public key isn't used for verifying KVACs
   */
  // eslint-disable-next-line no-empty-function
  async getVerificationMethod(_) {}
}

Bls12381BBDT16MACProofDock2024.Signature = Bls12381BBDT16MACDock2024;
Bls12381BBDT16MACProofDock2024.sigName = Bls12381BBDT16MacDockName;
Bls12381BBDT16MACProofDock2024.proofType = [
  Bls12381BBDT16MacProofDockName,
  `sec:${Bls12381BBDT16MacProofDockName}`,
  `https://w3id.org/security#${Bls12381BBDT16MacProofDockName}`,
];
