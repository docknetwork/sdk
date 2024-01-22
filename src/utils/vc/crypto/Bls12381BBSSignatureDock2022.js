import {
  BBSPlusCredential,
  BBSPlusCredentialBuilder,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381BBSSigDockSigName } from './constants';

import Bls12381G2KeyPairDock2022 from './Bls12381G2KeyPairDock2022';
import DockCryptoSignature from './common/DockCryptoSignature';

/**
 * A BBS+ signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBSSignatureDock2022 extends DockCryptoSignature {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    super(
      { ...options, signer: options.signer || Bls12381BBSSignatureDock2022.signerFactory(options.keypair, options.verificationMethod) },
      Bls12381BBSSigDockSigName,
      Bls12381G2KeyPairDock2022,
      'https://ld.dock.io/security/bbs/v1',
    );
  }
}

Bls12381BBSSignatureDock2022.KeyPair = Bls12381G2KeyPairDock2022;
Bls12381BBSSignatureDock2022.CredentialBuilder = BBSPlusCredentialBuilder;
Bls12381BBSSignatureDock2022.Credential = BBSPlusCredential;
Bls12381BBSSignatureDock2022.proofType = [
  Bls12381BBSSigDockSigName,
  `sec:${Bls12381BBSSigDockSigName}`,
  `https://w3id.org/security#${Bls12381BBSSigDockSigName}`,
];
