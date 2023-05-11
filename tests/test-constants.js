// The constants below are used for examples and tests

import {
  Statement,
  Witness,
  BBSKeypair,
  BBSPlusKeypairG2,
  BBSPlusPublicKeyG2,
  PSPublicKey,
  BBSPlusSignatureParamsG1,
  BBSPublicKey,
  BBSSignatureParams,
  PSKeypair,
  PSSignatureParams,
  PSSignature,
  BBSSignature,
  BBSPlusSignatureG1,
} from "@docknetwork/crypto-wasm-ts";
import BBSModule from "../src/modules/bbs";
import BBSPlusModule from "../src/modules/bbs-plus";
import PSModule from "../src/modules/ps";
import BBSPresentation from "../src/bbs-presentation";
import BBSPlusPresentation from "../src/bbs-plus-presentation";
import PSPresentation from "../src/ps-presentation";
import { convertToPresentation as convertToPSPresentation } from "../src/utils/vc/crypto/Bls12381PSSignatureProofDock2023";
import { convertToPresentation as convertToBBSPresentation } from "../src/utils/vc/crypto/Bls12381BBSSignatureProofDock2023";
import { convertToPresentation as convertToBBSPlusPresentation } from "../src/utils/vc/crypto/Bls12381BBSSignatureProofDock2022";
import Bls12381BBSKeyPairDock2023 from "../src/utils/vc/crypto/Bls12381BBSKeyPairDock2023";
import Bls12381G2KeyPairDock2022 from "../src/utils/vc/crypto/Bls12381G2KeyPairDock2022";
import Bls12381PSKeyPairDock2023 from "../src/utils/vc/crypto/Bls12381PSKeyPairDock2023";


require("dotenv").config();

const DefaultFullNodeEndpoint = "ws://localhost:9944";
const DefaultFullNodeTCPEndpoint = "http://localhost:9933";
const DefaultTestKeyringType = "sr25519";
const DefaultTestAccountURI = "//Alice";
const DefaultTestAccountCouncilMemberURI = "//Charlie";
const DefaultMinGasPrice = 50;
const DefaultMaxGas = 429496729;

/**
 * Read variable from environment or use the default value
 * @param varName - The variable name to read from environment variable
 * @param defaultVal - The default value if the variable is not found in environment.
 * @returns {string|*}
 */
function fromEnv(varName, defaultVal) {
  if (varName in process.env) {
    return process.env[varName];
  }
  if (defaultVal !== undefined) {
    return defaultVal;
  }
  throw new Error(`Environment variable "${varName}" not defined`);
}

export const FullNodeEndpoint = fromEnv(
  "FullNodeEndpoint",
  DefaultFullNodeEndpoint
);
export const FullNodeTCPEndpoint = fromEnv(
  "FullNodeTCPEndpoint",
  DefaultFullNodeTCPEndpoint
);
export const TestKeyringOpts = {
  type: fromEnv("TestKeyringType", DefaultTestKeyringType),
};
export const TestAccountURI = fromEnv("TestAccountURI", DefaultTestAccountURI);
export const TestAccountCouncilMemberURI = fromEnv(
  "TestAccountCouncilMemberURI",
  DefaultTestAccountCouncilMemberURI
);
export const MinGasPrice = fromEnv("MinGasPrice", DefaultMinGasPrice);
export const MaxGas = fromEnv("MaxGas", DefaultMaxGas);

export const BBS = {
  Name: "BBS",
  Module: BBSModule,
  PublicKey: BBSPublicKey,
  Presentation: BBSPresentation,
  buildStatement: Statement.bbsSignature,
  buildWitness: Witness.bbsSignature,
  getModule: (dock) => dock.bbs,
  SignatureParams: BBSSignatureParams,
  Signature: BBSSignature,
  KeyPair: BBSKeypair,
  CryptoKeyPair: Bls12381BBSKeyPairDock2023,
  convertToPresentation: convertToBBSPresentation,
  KeyType: "Bls12381BBSVerificationKeyDock2023",
  SigType: "Bls12381BBSSignatureDock2023",
  Context: "https://ld.dock.io/security/bbs23/v1",
  VerKey: "Bls12381BBSVerificationKeyDock2023",
};
export const BBSPlus = {
  Name: "BBS+",
  Module: BBSPlusModule,
  PublicKey: BBSPlusPublicKeyG2,
  Presentation: BBSPlusPresentation,
  buildStatement: Statement.bbsPlusSignature,
  buildWitness: Witness.bbsPlusSignature,
  getModule: (dock) => dock.bbsPlus,
  SignatureParams: BBSPlusSignatureParamsG1,
  Signature: BBSPlusSignatureG1,
  KeyPair: BBSPlusKeypairG2,
  CryptoKeyPair: Bls12381G2KeyPairDock2022,
  convertToPresentation: convertToBBSPlusPresentation,
  KeyType: "Bls12381G2VerificationKeyDock2022",
  Context: "https://ld.dock.io/security/bbs/v1",
  VerKey: "Bls12381G2VerificationKeyDock2022",
  SigType: "Bls12381BBS+SignatureDock2022",
};
export const PS = {
  Name: "PS",
  Module: PSModule,
  PublicKey: PSPublicKey,
  Presentation: PSPresentation,
  buildStatement: Statement.psSignature,
  buildWitness: Witness.psSignature,
  getModule: (dock) => dock.ps,
  SignatureParams: PSSignatureParams,
  Signature: PSSignature,
  KeyPair: PSKeypair,
  CryptoKeyPair: Bls12381PSKeyPairDock2023,
  convertToPresentation: convertToPSPresentation,
  KeyType: "Bls12381PSVerificationKeyDock2023",
  SigType: "Bls12381PSSignatureDock2023",
  Context: "https://ld.dock.io/security/ps/v1",
  VerKey: "Bls12381PSVerificationKeyDock2023",
};

export const Schemes = [BBS, BBSPlus, PS];
