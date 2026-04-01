import { DirectSecp256k1HdWallet } from '@docknetwork/cheqd-blockchain-api/wallet';
import { CheqdNetwork } from '@docknetwork/cheqd-blockchain-api';

export const faucet = {
  prefix: 'cheqd',
  minimalDenom: 'ncheq',
  mnemonic:
    process.env.CHEQD_MNEMONIC
    || 'steak come surprise obvious remain black trouble measure design volume retreat float coach amused match album moment radio stuff crack orphan ranch dose endorse',
  async wallet() {
    return await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      prefix: this.prefix,
    });
  },
};

export const url = process.env.CHEQD_RPC_URL || 'http://localhost:26657';
export const network = process.env.CHEQD_NETWORK || CheqdNetwork.Testnet;
