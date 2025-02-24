import { checkBalance } from '@cheqd/sdk';

export const getBalance = async (endpoint, account) => BigInt(
  (await checkBalance(account, endpoint)).find(
    (balance) => balance.denom === 'ncheq',
  )?.amount ?? 0,
);
