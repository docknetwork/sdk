import { minBigInt, ensureString } from '@docknetwork/credential-sdk/utils';

export const DEFAULT_TRANSFER_FEE = BigInt(1e10);

export const createTransfer = (from, to, ncheq) => ({
  typeUrl: '/cosmos.bank.v1beta1.MsgSend',
  value: {
    fromAddress: ensureString(from),
    toAddress: ensureString(to),
    amount: [
      {
        denom: 'ncheq',
        amount: String(ncheq),
      },
    ],
  },
});

export async function sendNcheq(
  api,
  recipientOrRecipients,
  amountPerRecipient,
  { fee = DEFAULT_TRANSFER_FEE, memo = '' } = {},
) {
  const recipients = [].concat(recipientOrRecipients);

  if (recipients.length === 0) {
    throw new Error("Can't send CHEQ: no recipients provided");
  } else if (BigInt(amountPerRecipient) <= fee) {
    throw new Error(
      `Can't send CHEQ: amount must be greater than transfer fee, received: ${amountPerRecipient}`,
    );
  }
  const from = await api.address();

  const txs = recipients.map((to) => createTransfer(from, to, amountPerRecipient));
  const feeObj = {
    amount: [
      {
        denom: 'ncheq',
        amount: String(BigInt(fee) * BigInt(recipients.length)),
      },
    ], // Fee amount in ncheq
    gas: String(
      minBigInt(api.blockLimit(), BigInt(12e4) * BigInt(recipients.length)),
    ), // Gas limit
    payer: from,
  };

  return await api.signAndBroadcast(from, txs, feeObj, memo);
}
