import pLimit from 'p-limit';
import {
  retry,
  ensureInstanceOf,
  ensureNumber,
} from '@docknetwork/credential-sdk/utils';
import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import { CheqdAPI } from '../api';
import { DirectSecp256k1HdWallet } from '../wallet';
import { DEFAULT_TRANSFER_FEE, sendNcheq } from '../utils';

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
    if (ensureNumber(count) <= 0) {
      throw new Error('Count must be greater than 0');
    } else if (senderWallets?.length && senderWallets.length !== count) {
      throw new Error('`senderWallets` length must be equal to count');
    }

    this.#rootApi = ensureInstanceOf(api, AbstractApiProvider);
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

  async #initializeSenders(params) {
    return await Promise.all(
      this.#senderWallets.map((wallet) => new CheqdAPI().init({
        ...params,
        wallet,
      })),
    );
  }

  async init(params) {
    this.ensureNotShuttingDown();
    this.ensureNotInitialized();

    try {
      this.#spawn = pLimit(this.count);
      this.#senderWallets ??= await this.#generateWallets();
      this.#senders = await this.#initializeSenders(params);

      await sendNcheq(
        this.#rootApi,
        await Promise.all(this.#senders.map((sender) => sender.address())),
        this.#amountPerSender,
      );

      return this;
    } catch (error) {
      this.#spawn = void 0;
      this.#senders = void 0;
      this.#senderWallets = void 0;

      error.message = `Initialization failed: ${error.message}`;

      throw error;
    }
  }

  async signAndSend(...args) {
    this.ensureInitialized();

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
    this.ensureInitialized();

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
          let tx = null;
          const balance = await sender.balanceOf(await sender.address());
          if (balance - BigInt(DEFAULT_TRANSFER_FEE) >= 0n) {
            tx = await sendNcheq(
              sender,
              await this.#rootApi.address(),
              balance - BigInt(DEFAULT_TRANSFER_FEE),
            );
          }
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

  get count() {
    return this.#count;
  }

  get isShuttingDown() {
    return this.#shuttingDown;
  }

  get senderWallets() {
    return this.#senderWallets;
  }

  get senders() {
    return this.#senders;
  }

  isInitialized() {
    return Boolean(this.#spawn);
  }

  ensureNotShuttingDown() {
    if (this.isShuttingDown) {
      throw new Error('System is shutting down');
    }
  }

  ensureNotInitialized() {
    if (this.isInitialized()) {
      throw new Error('`MutiSender` is already initialized');
    }
  }

  ensureInitialized() {
    this.ensureNotShuttingDown();

    if (!this.isInitialized()) {
      throw new Error('`MutiSender` is not initialized');
    }
  }
}
