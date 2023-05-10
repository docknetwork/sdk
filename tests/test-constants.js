// The constants below are used for examples and tests

import { BBSKeypair, BBSPlusKeypairG2, BBSPlusSignatureParamsG1, BBSSignatureParams, PSKeypair, PSSignatureParams } from "@docknetwork/crypto-wasm-ts";
import BBSModule from "../src/modules/bbs";
import BBSPlusModule from "../src/modules/bbs-plus";
import PSModule from "../src/modules/ps";
import BBSPresentation from "../src/bbs-presentation";
import BBSPlusPresentation from "../src/bbs-plus-presentation";
import PSPresentation from "../src/ps-presentation";

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
  Presentation: BBSPresentation,
  getModule: (dock) => dock.bbs,
  SignatureParams: BBSSignatureParams,
  KeyPair: BBSKeypair,
  KeyType: 'Bls12381G2VerificationKeyDock2022'
};
export const BBSPlus = {
  Name: "BBS+",
  Module: BBSPlusModule,
  Presentation: BBSPlusPresentation,
  getModule: (dock) => dock.bbsPlus,
  SignatureParams: BBSPlusSignatureParamsG1,
  KeyPair: BBSPlusKeypairG2,
  KeyType: 'Bls12381G2VerificationKeyDock2022'
};
export const PS = {
  Name: "PS",
  Module: PSModule,
  Presentation: PSPresentation,
  getModule: (dock) => dock.ps,
  SignatureParams: PSSignatureParams,
  KeyPair: PSKeypair,
  KeyType: 'Bls12381PSVerificationKeyDock2022'
};

export const Schemes = [BBS, BBSPlus, PS]
