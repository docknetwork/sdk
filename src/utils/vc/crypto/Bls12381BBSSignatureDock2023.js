import {
  BBSCredential,
  BBSCredentialBuilder,
} from '@docknetwork/crypto-wasm-ts';

import { Bls12381BBS23SigDockSigName } from './constants';

import Bls12381BBSKeyPairDock2023 from './Bls12381BBSKeyPairDock2023';
import DockCryptoSignature from './common/DockCryptoSignature';

/**
 * A BBS signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBSSignatureDock2023 extends DockCryptoSignature {
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
          || Bls12381BBSSignatureDock2023.signerFactory(
            options.keypair,
            options.verificationMethod,
          ),
      },
      Bls12381BBS23SigDockSigName,
      Bls12381BBSKeyPairDock2023,
      'https://ld.dock.io/security/bbs23/v1',
    );
  }
}

Bls12381BBSSignatureDock2023.KeyPair = Bls12381BBSKeyPairDock2023;
Bls12381BBSSignatureDock2023.CredentialBuilder = BBSCredentialBuilder;
Bls12381BBSSignatureDock2023.Credential = BBSCredential;
Bls12381BBSSignatureDock2023.proofType = [
  Bls12381BBS23SigDockSigName,
  `sec:${Bls12381BBS23SigDockSigName}`,
  `https://w3id.org/security#${Bls12381BBS23SigDockSigName}`,
];
