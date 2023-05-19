import { BBSPublicKey } from '@docknetwork/crypto-wasm-ts';
import {
  Bls12381BBS23SigProofDockSigName,
  Bls12381BBS23SigDockSigName,
} from './constants';

import Bls12381BBSKeyPairDock2023 from './Bls12381BBSKeyPairDock2023';
import DockCryptoSignatureProof from './common/DockCryptoSignatureProof';
import Bls12381BBSSignatureDock2023 from './Bls12381BBSSignatureDock2023';

/**
 * A BBS signature suite for use with derived BBS credentials aka BBS presentations
 */
export default class Bls12381BBSSignatureProofDock2023 extends DockCryptoSignatureProof {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      options,
      Bls12381BBS23SigProofDockSigName,
      Bls12381BBSKeyPairDock2023,
      BBSPublicKey,
      Bls12381BBSSignatureDock2023,
    );
  }

  static convertToPresentation(document) {
    return super.convertToPresentation(document, Bls12381BBS23SigDockSigName);
  }
}

Bls12381BBSSignatureProofDock2023.proofType = [
  Bls12381BBS23SigProofDockSigName,
  `sec:${Bls12381BBS23SigProofDockSigName}`,
  `https://w3id.org/security#${Bls12381BBS23SigProofDockSigName}`,
];
