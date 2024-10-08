import {
  Bls12381BBSSigProofDockSigName,
  Bls12381BBSSigDockSigName,
} from './constants';

import Bls12381G2KeyPairDock2022 from './Bls12381G2KeyPairDock2022';
import DockCryptoSignatureProof from './common/DockCryptoSignatureProof';
import Bls12381BBSSignatureDock2022 from './Bls12381BBSSignatureDock2022';

/**
 * A BBS+ signature suite for use with derived BBS+ credentials aka BBS+ presentations
 */
export default class Bls12381BBSSignatureProofDock2022 extends DockCryptoSignatureProof {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      options,
      Bls12381BBSSigProofDockSigName,
      Bls12381G2KeyPairDock2022,
      'https://ld.dock.io/security/bbs/v1',
    );
  }
}

Bls12381BBSSignatureProofDock2022.Signature = Bls12381BBSSignatureDock2022;
Bls12381BBSSignatureProofDock2022.sigName = Bls12381BBSSigDockSigName;
Bls12381BBSSignatureProofDock2022.proofType = [
  Bls12381BBSSigProofDockSigName,
  `sec:${Bls12381BBSSigProofDockSigName}`,
  `https://w3id.org/security#${Bls12381BBSSigProofDockSigName}`,
];
