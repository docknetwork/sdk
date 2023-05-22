import { PSPublicKey } from '@docknetwork/crypto-wasm-ts';
import {
  Bls12381PSSigDockSigName,
  Bls12381PSSigProofDockSigName,
} from './constants';

import Bls12381PSKeyPairDock2023 from './Bls12381PSKeyPairDock2023';
import DockCryptoSignatureProof from './common/DockCryptoSignatureProof';
import Bls12381PSSignatureDock2023 from './Bls12381PSSignatureDock2023';

/**
 * A PS signature suite for use with derived PS credentials aka PS presentations
 */
export default class Bls12381PSSignatureProofDock2022 extends DockCryptoSignatureProof {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      options,
      Bls12381PSSigProofDockSigName,
      Bls12381PSKeyPairDock2023,
      PSPublicKey,
      Bls12381PSSignatureDock2023,
      'https://ld.dock.io/security/ps/v1',
    );
  }

  static convertToPresentation(document) {
    return super.convertToPresentation(document, Bls12381PSSigDockSigName);
  }
}

Bls12381PSSignatureProofDock2022.proofType = [
  Bls12381PSSigProofDockSigName,
  `sec:${Bls12381PSSigProofDockSigName}`,
  `https://w3id.org/security#${Bls12381PSSigProofDockSigName}`,
];
