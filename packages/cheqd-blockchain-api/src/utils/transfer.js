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

/**
 * Sends ncheq tokens to recipient addresses through the bank module
 * @param {any} api - The API instance used for blockchain operations
 * @param {string | Array<string>} recipientOrRecipients - Recipient address(es)
 * @param {bigint} amountPerRecipient - Amount of tokens to send per recipient in ncheq units
 * @param {object} [options={}] - Optional configuration object
 * @param {bigint} [options.fee=DEFAULT_TRANSFER_FEE] - Transaction fee for the transfer
 * @param {string} [options.memo=''] - Memo to attach to the transaction
 * @returns {Promise<object>} A promise that resolves when the transaction is broadcast
 *
 * @example
 * // Send 100ncheq to a single recipient
 * await sendNcheq(api, 'recipient_address', 100n);
 *
 * // Send 50ncheq to multiple recipients with custom fee and memo
 * await sendNcheq(api, ['addr1', 'addr2'], 50n, {
 *   fee: 1e10n,
 *   memo: 'Transaction memo'
 * });
 */
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
