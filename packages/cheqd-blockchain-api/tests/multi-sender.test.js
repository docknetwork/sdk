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
      expect(Number(await api.balanceOf(await api.address()))).toEqual(
        Number(amount)
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
      expect(Number(await queryAPI.balanceOf(address))).toEqual(
        Number(BigInt(0))
      );
    }

    expect(Number(initBalance + 10n * (amount - DEFAULT_TRANSFER_FEE))).toEqual(
      Number(await queryAPI.balanceOf(mainAddress))
    );
  });
});
