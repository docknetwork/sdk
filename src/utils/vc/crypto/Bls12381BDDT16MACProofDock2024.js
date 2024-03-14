import {
  Bls12381BDDT16MacProofDockName, Bls12381BDDT16MacDockName,
} from './constants';

import DockCryptoSignatureProof from './common/DockCryptoSignatureProof';
import Bls12381BDDT16KeyPairDock2024 from './Bls12381BDDT16KeyPairDock2024';
import Bls12381BDDT16MACDock2024 from './Bls12381BDDT16MACDock2024';

/**
 * A BDDT16 signature suite for use with derived BDDT16 credentials aka BDDT16 presentations
 */
export default class Bls12381BDDT16MACProofDock2024 extends DockCryptoSignatureProof {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      options,
      Bls12381BDDT16MacProofDockName,
      Bls12381BDDT16KeyPairDock2024,
      'https://ld.dock.io/security/bddt16/v1',
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

Bls12381BDDT16MACProofDock2024.Signature = Bls12381BDDT16MACDock2024;
Bls12381BDDT16MACProofDock2024.sigName = Bls12381BDDT16MacDockName;
Bls12381BDDT16MACProofDock2024.proofType = [
  Bls12381BDDT16MacProofDockName,
  `sec:${Bls12381BDDT16MacProofDockName}`,
  `https://w3id.org/security#${Bls12381BDDT16MacProofDockName}`,
];
