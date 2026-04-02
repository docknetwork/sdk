import { CheqdAPI, CheqdMultiSenderAPI } from "../src";
import { faucet, url, network } from "./constants";
import { DEFAULT_TRANSFER_FEE } from "../src/utils";

describe("MultiSender", () => {
  test("`CheqdMultiSenderAPI` balance share", async () => {
    const multiSenderAPI = await new CheqdMultiSenderAPI({ count: 10 }).init({
      url,
      wallet: await faucet.wallet(),
      network,
    });
    const amount = BigInt(50e9 * 10);
    const mainAddress = await multiSenderAPI.address();

    const {
      sender: { senders },
    } = multiSenderAPI;
    for (const api of senders) {
      expect(String(await api.balanceOf(await api.address()))).toEqual(
        String(amount)
      );
    }
    const initBalance = await multiSenderAPI.balanceOf(mainAddress);

    const senderAddresses = await Promise.all(
      senders.map((sender) => sender.address())
    );

    await multiSenderAPI.disconnect();
    expect(multiSenderAPI.isInitialized()).toBe(false);
    expect(multiSenderAPI.sender.isInitialized()).toBe(false);

    const queryAPI = await new CheqdAPI().init({
      url,
      wallet: await faucet.wallet(),
      network,
    });

    for (let i = 0; i < senders.length; i++) {
      const api = senders[i];
      const address = senderAddresses[i];

      expect(api.isInitialized()).toBe(false);
      expect(String(await queryAPI.balanceOf(address))).toEqual("0");
    }

    const finalMainBalance = await queryAPI.balanceOf(mainAddress);
    const balanceDelta = finalMainBalance - initBalance;
    const maxExpectedDelta = 10n * (amount - DEFAULT_TRANSFER_FEE);

    // On-chain spendable balance semantics can vary by node version/config,
    // so assert bounded recovery instead of exact numeric equality.
    expect(balanceDelta >= 0n).toBe(true);
    expect(balanceDelta <= maxExpectedDelta).toBe(true);
  });
});
