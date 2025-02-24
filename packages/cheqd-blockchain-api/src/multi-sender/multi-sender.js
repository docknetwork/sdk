import pLimit from 'p-limit';
import { retry } from '@docknetwork/credential-sdk/utils';
import { CheqdAPI } from '../api';
import { DirectSecp256k1HdWallet } from '../wallet';
import { DEFAULT_TRANSFER_FEE, sendNcheq } from '../balance';

export default class MultiSender {
  #rootApi;

  #count;

  #senderWallets;

  #amountPerSender;

  #shuttingDown;

  #spawn;

  #senders;

  constructor({
    api,
    count,
    senderWallets,
    amountPerSender = 50e9 * 10, // 500 CHEQ - allows to create either 10 DID Documents or 100 DID Linked Resources
  } = {}) {
    if (!api) throw new Error('API instance is required');
    if (!count || count <= 0) throw new Error('Valid count is required');

    this.#rootApi = api;
    this.#count = count;
    this.#senderWallets = senderWallets;
    this.#amountPerSender = amountPerSender;
    this.#shuttingDown = false;
    this.#senders = [];
  }

  async #generateWallets() {
    return await Promise.all(
      Array.from({ length: this.#count }, () => DirectSecp256k1HdWallet.generate(24, {
        prefix: 'cheqd',
      })),
    );
  }

  async #initializeSenders() {
    return await Promise.all(
      this.#senderWallets.map((wallet) => new CheqdAPI().init({
        wallet,
        network: this.#rootApi.network(),
        url: this.#rootApi.url(),
      })),
    );
  }

  async init() {
    if (this.#shuttingDown) {
      throw new Error('System is shutting down');
    }
    try {
      this.#senderWallets ??= await this.#generateWallets();
      this.#senders = await this.#initializeSenders();

      await sendNcheq(
        this.#rootApi,
        await Promise.all(this.#senders.map((sender) => sender.address())),
        this.#amountPerSender,
      );
      this.#spawn = pLimit(this.count);

      return this;
    } catch (error) {
      error.message = `Initialization failed: ${error.message}`;

      throw error;
    }
  }

  async signAndSend(...args) {
    if (this.#shuttingDown) {
      throw new Error('System is shutting down');
    }

    if (
      !this.#senders
      || this.#senders.length !== this.#count
      || !this.#spawn
    ) {
      throw new Error('Please initialize the system by calling init() first');
    }

    return await this.#spawn(async () => {
      const sender = this.#senders.pop();
      if (!sender) {
        throw new Error('No available senders');
      }

      const onError = async (err, continueSym) => {
        if (String(err).includes('balance')) {
          await sendNcheq(
            this.#rootApi,
            await sender.address(),
            this.#amountPerSender,
          );
          return continueSym;
        }

        throw err;
      };

      try {
        return await retry(() => sender.signAndSend(...args), {
          onError,
        });
      } finally {
        this.#senders.push(sender);
      }
    });
  }

  async shutdown() {
    try {
      this.#spawn.clearQueue();
      this.#shuttingDown = true;

      const shutdownTasks = Array.from({ length: this.#count }, async () => {
        const sender = this.#senders.pop();
        if (!sender) return null;

        if (this.#spawn.concurrency > 1) {
          this.#spawn.concurrency--;
        } else {
          this.#spawn = undefined;
        }
        try {
          const balance = await sender.balanceOf(await sender.address());
          const tx = await sendNcheq(
            sender,
            await this.#rootApi.address(),
            balance - BigInt(DEFAULT_TRANSFER_FEE),
          );
          await sender.disconnect();

          return tx;
        } catch (error) {
          error.message = `Shutdown error for sender: ${error.message}`;
          console.error(error);

          return null;
        }
      });

      const results = await Promise.all(shutdownTasks);
      return results.filter(Boolean);
    } finally {
      this.#shuttingDown = false;
    }
  }

  // Getters for private fields if needed
  get count() {
    return this.#count;
  }

  get isShuttingDown() {
    return this.#shuttingDown;
  }
}
