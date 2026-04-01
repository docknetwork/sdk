import { jest } from "@jest/globals";
import { CheqdAPI, CheqdNetwork } from "../src";

const createWallet = () => ({
  getAccounts: jest.fn().mockResolvedValue([{ address: "addr1" }]),
});

const createSdk = (options, { heightReject = false } = {}) => {
  const getHeight = jest.fn(() =>
    heightReject
      ? Promise.reject(new Error("height error"))
      : Promise.resolve("123")
  );

  const signer = {
    endpoint: options.endpoint,
    getHeight,
    simulate: jest.fn(),
    signAndBroadcast: jest.fn(),
    getTx: jest.fn(),
    getBalance: jest.fn(),
  };

  return {
    signer,
    options: { ...options },
  };
};

describe("CheqdAPI connection failover", () => {
  let wallet;
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    wallet = createWallet();
  });

  test("falls back to the next URL when health check fails", async () => {
    const sdkFactory = jest
      .fn()
      .mockImplementationOnce((options) =>
        createSdk(options, { heightReject: true })
      )
      .mockImplementationOnce((options) => createSdk(options));

    const api = await new CheqdAPI({ sdkFactory }).init({
      urls: ["http://bad-url", "http://good-url"],
      wallet,
      network: CheqdNetwork.Testnet,
    });

    expect(api.url()).toBe("http://good-url");
    expect(sdkFactory).toHaveBeenCalledTimes(2);
    expect(sdkFactory.mock.calls[0][0].rpcUrl).toBe("http://bad-url");
    expect(sdkFactory.mock.calls[1][0].rpcUrl).toBe("http://good-url");
  });

  test("reconnect retries URLs in order and stores successful endpoint", async () => {
    const sdkFactory = jest
      .fn()
      .mockImplementationOnce((options) => createSdk(options));

    const api = await new CheqdAPI({ sdkFactory }).init({
      url: "http://primary",
      urls: ["http://backup"],
      wallet,
      network: CheqdNetwork.Testnet,
    });

    sdkFactory
      .mockImplementationOnce((options) =>
        createSdk(options, { heightReject: true })
      )
      .mockImplementationOnce((options) => createSdk(options));

    await api.reconnect();

    expect(api.url()).toBe("http://backup");

    const callArgs = sdkFactory.mock.calls.map(([options]) => options.rpcUrl);
    expect(callArgs).toEqual([
      "http://primary",
      "http://primary",
      "http://backup",
    ]);
  });

  test("init throws when no URLs are provided", async () => {
    const sdkFactory = jest.fn();
    await expect(
      new CheqdAPI({ sdkFactory }).init({
        wallet,
        network: CheqdNetwork.Testnet,
      })
    ).rejects.toThrow("At least one RPC `url` must be provided");
    expect(sdkFactory).not.toHaveBeenCalled();
  });
});

