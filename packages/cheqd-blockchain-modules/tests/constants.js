export const faucet = {
  prefix: "cheqd",
  minimalDenom: "ncheq",
  mnemonic: process.env.CHEQD_MNEMONIC ||
    "steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse",
  address: process.env.CHEQD_SENDER_ADDRESS || "cheqd1fgl67nvjdkrnaemjzg5sqvck9fcst4vt99gmma",
};

export const url = process.env.CHEQD_RPC_URL || "http://localhost:26657";
