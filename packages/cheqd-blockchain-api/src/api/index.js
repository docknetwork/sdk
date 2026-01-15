import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import { GasPrice } from '@cosmjs/stargate';
import {
  maybeToJSONString,
  fmtIterable,
  extendNull,
  maybeToCheqdPayloadOrJSON,
  retry,
  minBigInt,
} from '@docknetwork/credential-sdk/utils';
import {
  DIDModule,
  ResourceModule,
  createCheqdSDK,
  CheqdNetwork,
  FeemarketModule,
  // eslint-disable-next-line no-unused-vars
  CheqdSDK,
  calculateDidFee,
  CheqdQuerier,
  setupFeemarketExtension,
} from '@cheqd/sdk';
import {
  DidRef,
  NamespaceDid,
  CheqdSetDidDocumentPayloadWithTypeUrlAndSignatures,
  CheqdCheqdDeactivateDidDocumentPayloadWithTypeUrlAndSignatures,
  CheqdCreateResourcePayloadWithTypeUrlAndSignatures,
  CheqdCreateResource,
  CheqdDIDDocument,
  CheqdDeactivateDidDocument,
  CheqdTestnetAccumulatorId,
  CheqdTestnetAccumulatorPublicKey,
  CheqdTestnetBlobId,
  CheqdTestnetDid,
  CheqdTestnetStatusListCredentialId,
  CheqdTestnetDIDDocument,
  CheqdMainnetAccumulatorId,
  CheqdMainnetAccumulatorPublicKey,
  CheqdMainnetBlobId,
  CheqdMainnetDid,
  CheqdMainnetStatusListCredentialId,
  CheqdMainnetDIDDocument,
  CheqdMainnetStoredAccumulator,
  CheqdTestnetStoredAccumulator,
  CheqdTestnetOffchainSignatureKeyRef,
  CheqdMainnetOffchainSignatureKeyRef,
  CheqdTestnetAccumulator,
  CheqdMainnetAccumulator,
  DockDidOrDidMethodKey,
  CheqdMainnetVerificationMethodSignature,
  CheqdTestnetVerificationMethodSignature,
  CheqdTestnetAccumulatorCommon,
  CheqdMainnetAccumulatorCommon,
  CheqdMainnetOffchainSignaturePublicKeyValue,
  CheqdTestnetOffchainSignaturePublicKeyValue,
} from '@docknetwork/credential-sdk/types';
import { TypedEnum } from '@docknetwork/credential-sdk/types/generic';
import pLimit from 'p-limit';
import { buildTypeUrlObject, fullTypeUrl } from './type-url';

export class CheqdAPI extends AbstractApiProvider {
  #sdk;

  #spawn;

  #connectionConfig;

  #sdkFactory;

  /**
   * Creates a new instance of the CheqdAPI object, call init to initialize
   * @constructor
   */
  constructor({ sdkFactory } = {}) {
    super();
    if (sdkFactory != null && typeof sdkFactory !== 'function') {
      throw new Error('`sdkFactory` must be a function');
    }

    this.#sdkFactory = sdkFactory ?? createCheqdSDK;
  }

  /**
   * @returns {CheqdSDK}
   */
  get sdk() {
    return this.ensureInitialized().#sdk;
  }

  static PayloadWrappers = buildTypeUrlObject(
    CheqdSetDidDocumentPayloadWithTypeUrlAndSignatures,
    CheqdSetDidDocumentPayloadWithTypeUrlAndSignatures,
    CheqdCheqdDeactivateDidDocumentPayloadWithTypeUrlAndSignatures,
    CheqdCreateResourcePayloadWithTypeUrlAndSignatures,
  );

  static BlockLimits = extendNull({
    [CheqdNetwork.Testnet]: BigInt(3e7),
    [CheqdNetwork.Mainnet]: BigInt(3e7),
  });

  static Types = extendNull({
    [CheqdNetwork.Testnet]: extendNull({
      Did: CheqdTestnetDid,
      DidDocument: CheqdTestnetDIDDocument,
      Accumulator: CheqdTestnetAccumulator,
      AccumulatorCommon: CheqdTestnetAccumulatorCommon,
      AccumulatorId: CheqdTestnetAccumulatorId,
      AccumulatorPublicKey: CheqdTestnetAccumulatorPublicKey,
      StoredAccumulator: CheqdTestnetStoredAccumulator,
      OffchainSignatureKeyRef: CheqdTestnetOffchainSignatureKeyRef,
      OffchainSignaturePublicKeyValue:
        CheqdTestnetOffchainSignaturePublicKeyValue,
      BlobId: CheqdTestnetBlobId,
      StatusListCredentialId: CheqdTestnetStatusListCredentialId,
      VerificationMethodSignature: CheqdTestnetVerificationMethodSignature,
    }),
    [CheqdNetwork.Mainnet]: extendNull({
      Did: CheqdMainnetDid,
      DidDocument: CheqdMainnetDIDDocument,
      AccumulatorCommon: CheqdMainnetAccumulatorCommon,
      AccumulatorId: CheqdMainnetAccumulatorId,
      AccumulatorPublicKey: CheqdMainnetAccumulatorPublicKey,
      Accumulator: CheqdMainnetAccumulator,
      StoredAccumulator: CheqdMainnetStoredAccumulator,
      OffchainSignatureKeyRef: CheqdMainnetOffchainSignatureKeyRef,
      OffchainSignaturePublicKeyValue:
        CheqdMainnetOffchainSignaturePublicKeyValue,
      BlobId: CheqdMainnetBlobId,
      StatusListCredentialId: CheqdMainnetStatusListCredentialId,
      VerificationMethodSignature: CheqdMainnetVerificationMethodSignature,
    }),
  });

  /**
   * Converts supplied transaction(s) to the array containing their JSON representation.
   * @param {*} tx
   * @returns {Array<object>}
   */
  static txToJSON(txOrTxs) {
    return [].concat(txOrTxs).map((tx) => {
      const { PayloadWrappers } = this;
      const typeUrl = fullTypeUrl(tx.typeUrl);

      const PayloadWrapper = PayloadWrappers[typeUrl];

      if (PayloadWrapper == null) {
        throw new Error(`No payload wrapper found for \`${typeUrl}\``);
      }

      return { ...maybeToCheqdPayloadOrJSON(PayloadWrapper.from(tx)), typeUrl };
    });
  }

  /**
   * Converts payload of the supplied method to bytes.
   *
   * @param {string} method
   * @param {object} payload
   * @returns {Promise<Uint8Array>}
   */
  async payloadToBytes(method, payload) {
    const {
      Payloads: { [fullTypeUrl(method)]: Payloads },
    } = this;
    if (Payloads == null) {
      throw new Error(
        `Can't find payload constructor for the provided method \`${method}\``,
      );
    }
    const [TypedPayload, Payload] = Payloads;

    const typedPayload = TypedPayload.from(payload);
    const jsonPayload = maybeToCheqdPayloadOrJSON(typedPayload);
    const sdkPayload = Payload.fromPartial(jsonPayload);

    try {
      return Payload.encode(sdkPayload).finish();
    } catch (err) {
      throw new Error(
        `Failed to encode payload \`${maybeToJSONString(sdkPayload)}\`: ${err}`,
      );
    }
  }

  /**
   * Initializes `CheqdAPI` with the supplied url, wallet and network type.
   * @param {object} configuration
   * @param {string} [configuration.url]
   * @param {*} [configuration.wallet]
   * @param {string} [configuration.network]
   * @returns {Promise<this>}
   */
  async init({
    url,
    urls,
    wallet,
    network,
  } = {}) {
    if (network !== CheqdNetwork.Mainnet && network !== CheqdNetwork.Testnet) {
      throw new Error(
        `Invalid network provided: \`${network}\`, expected one of \`${fmtIterable(
          Object.values(CheqdNetwork),
        )}\``,
      );
    } else if (wallet == null) {
      throw new Error('`wallet` must be provided');
    }

    const rpcUrls = this.#normalizeUrls(url, urls);

    this.ensureNotInitialized();

    const {
      MsgCreateDidDocPayload,
      MsgUpdateDidDocPayload,
      MsgDeactivateDidDocPayload,
    } = await import('@cheqd/ts-proto/cheqd/did/v2/index.js');
    const { MsgCreateResourcePayload } = await import(
      '@cheqd/ts-proto/cheqd/resource/v2/index.js'
    );

    this.Payloads = buildTypeUrlObject(
      [CheqdDIDDocument, MsgCreateDidDocPayload],
      [CheqdDIDDocument, MsgUpdateDidDocPayload],
      [CheqdDeactivateDidDocument, MsgDeactivateDidDocPayload],
      [CheqdCreateResource, MsgCreateResourcePayload],
    );

    const { sdk, options } = await this.#connectWithFallback(
      rpcUrls,
      wallet,
      network,
    );

    this.ensureNotInitialized();
    this.#sdk = sdk;
    this.#spawn = pLimit(1);
    this.#connectionConfig = {
      urls: rpcUrls,
      wallet,
      network,
    };
    this.#sdk.signer.endpoint = options.endpoint; // HACK: cheqd SDK doesnt pass this with createCheqdSDK yet

    if (options.gasPrice) {
      this.setGasPrice(options.gasPrice);
    } else {
      const querier = (await CheqdQuerier.connectWithExtension(
        rpcUrls[0],
        setupFeemarketExtension,
      ));

      const feemarketModule = new FeemarketModule(this.#sdk.signer, querier);
      const gasPrice = await feemarketModule.queryGasPrice('ncheq');
      this.setGasPrice(gasPrice?.price ? GasPrice.fromString(`${gasPrice.price.amount}${gasPrice.price.denom}`) : undefined);
    }

    return this;
  }

  /**
   * Sets the gas price for fee estimation
   */
  setGasPrice(gasPrice) {
    this.gasPrice = gasPrice ?? GasPrice.fromString('5000ncheq');
  }

  /**
   * @returns {Promise<this>}
   */
  async disconnect() {
    this.ensureInitialized();
    this.#sdk = void 0;
    this.#spawn = void 0;
    this.Payloads = void 0;

    return this;
  }

  /**
   * @returns {boolean}
   */
  isInitialized() {
    return this.#sdk != null;
  }

  /**
   * Estimates gas value for the provided transaction(s). The estimate is not accurate as it's based on static value.
   *
   * @param {object|Array<object>} txOrTxs
   * @returns {Promise<BigInt>}
   */
  async estimateGas(txOrTxs, from) {
    const txs = this.constructor.txToJSON(txOrTxs);
    const simulatedGas = await this.sdk.signer.simulate(from, txs);
    return String(simulatedGas);
  }

  /**
   * Calculate fee for the provided transaction(s).
   *
   * @param {object|Array<object>} txOrTxs
   * @returns {BigInt}
   */
  async calculateFee(txOrTxs, signerAddress, estimatedGas = null, multiplier = 1.3, memo = '') {
    const gasEstimation = estimatedGas ?? (await this.simulate(signerAddress, Array.isArray(txOrTxs) ? txOrTxs : [txOrTxs], memo));
    const usedFee = calculateDidFee(Math.round(gasEstimation * multiplier), this.gasPrice);
    return usedFee.amount[0];
  }

  /**
   * Converts payload of the supplied method to bytes.
   *
   * @param {string} method
   * @param {object} payload
   * @returns {Promise<Uint8Array>}
   */
  async stateChangeBytes(method, payload) {
    return await this.payloadToBytes(method, payload);
  }

  /**
   * Signs and broadcasts transaction using underlying `sdk.signer.signAndBroadcast` but retries in case of specific errors.
   *
   * @param {string} sender
   * @param {Array<object>} txJSON
   * @param {DidStdFee | 'auto' | number} payment
   * @param {?string} memo
   * @returns {Promise<object>}
   */
  async signAndBroadcast(sender, txJSON, payment, memo) {
    const { BlockLimits } = this.constructor;

    const onError = async (err, continueSym) => {
      const strErr = String(err);

      if (
        strErr.includes('fetch failed')
        || strErr.includes('Bad status')
        || strErr.includes('other side closed')
      ) {
        console.error(err);
        await this.reconnect();

        return continueSym;
      } else if (strErr.includes('out of gas in location')) {
        if (payment.gas) {
          const gasAmount = BigInt(payment.gas);
          const limit = BlockLimits[this.network()];
          if (gasAmount >= limit) {
            throw new Error(
              `Can't process transaction because it exceeds block gas limit: ${JSON.stringify(
                txJSON,
              )}`,
            );
          }

          // eslint-disable-next-line no-param-reassign
          payment.gas = String(minBigInt(gasAmount * 2n, limit));
        } else {
          throw err;
        }
        return continueSym;
      } else if (strErr.includes('account sequence mismatch')) {
        return continueSym;
      }

      throw err;
    };

    return await this.#spawn(() => retry(
      async () => {
        const res = await this.sdk.signer.signAndBroadcast(sender, txJSON, payment, memo ?? '');
        if (res.code) {
          throw new Error(
            JSON.stringify(res, (_, value) => (typeof value === 'bigint' ? `${value.toString()}n` : value)),
          );
        }

        return res;
      },
      {
        onError,
        delay: 5e2,
        timeLimit: 18e3,
      },
    ));
  }

  /**
   * Signs and sends supplied transaction with the supplied configuration.
   *
   * @param {object} tx
   * @param {object} configuration
   * @param {string} configuration.from
   * @param {object} configuration.fee
   * @returns {Promise<*>}
   */
  async signAndSend(tx, {
    from, fee, memo, gas, payment,
  } = {}) {
    const sender = from ?? (await this.address());
    const txJSON = this.constructor.txToJSON(tx);

    const estimatedGas = gas ?? (await this.estimateGas(tx, sender));
    const paymentObj = payment || {
      amount: [].concat(fee ?? (await this.calculateFee(tx, sender, estimatedGas))),
      gas: estimatedGas,
      payer: sender,
    };

    return await this.signAndBroadcast(sender, txJSON, paymentObj, memo);
  }

  async reconnect() {
    this.ensureInitialized();
    const { urls, wallet, network } = this.#connectionConfig ?? {};

    if (!urls?.length) {
      throw new Error('Cannot reconnect because no RPC URLs are configured');
    }

    return await retry(
      async () => {
        try {
          await this.disconnect();
        } catch (error) {
          console.error(error);
        }

        return await this.init({
          urls,
          network,
          wallet,
        });
      },
      { delay: 5e2, timeLimit: 1e4 },
    );
  }

  #normalizeUrls(url, urls) {
    const orderedUrls = [];
    const pushIfValid = (candidate, { prepend = false } = {}) => {
      if (typeof candidate !== 'string') {
        return;
      }
      const trimmed = candidate.trim();
      if (trimmed === '') {
        return;
      }
      if (prepend) {
        orderedUrls.unshift(trimmed);
      } else {
        orderedUrls.push(trimmed);
      }
    };

    if (Array.isArray(urls)) {
      urls.forEach((candidate) => pushIfValid(candidate));
    } else {
      pushIfValid(urls);
    }
    pushIfValid(url, { prepend: true });

    const uniqueUrls = orderedUrls.filter(
      (candidate, index, self) => self.indexOf(candidate) === index,
    );

    if (!uniqueUrls.length) {
      throw new Error('At least one RPC `url` must be provided');
    }

    return uniqueUrls;
  }

  async #connectWithFallback(urls, wallet, network) {
    const attemptConnection = async (index, lastError) => {
      if (index >= urls.length) {
        const details = lastError ? ` Last error: ${lastError.message ?? lastError}` : '';
        throw new Error(
          `Unable to connect to any provided Cheqd RPC endpoint: \`${fmtIterable(urls)}\`.${details}`,
        );
      }

      const candidateUrl = urls[index];

      try {
        return await this.#createSdk(candidateUrl, wallet, network);
      } catch (error) {
        console.error(`Failed to connect to Cheqd RPC endpoint \`${candidateUrl}\``, error);
        return await attemptConnection(index + 1, error);
      }
    };

    return await attemptConnection(0);
  }

  async #createSdk(rpcUrl, wallet, network) {
    const options = {
      modules: [DIDModule, ResourceModule, FeemarketModule],
      rpcUrl,
      endpoint: rpcUrl,
      wallet,
      network,
    };

    const sdk = await this.#sdkFactory(options);
    await sdk.signer.getHeight();

    return { sdk, options };
  }

  types() {
    const { Types } = this.constructor;

    return Types[this.network()];
  }

  blockLimit() {
    const { BlockLimits } = this.constructor;

    return BlockLimits[this.network()];
  }

  network() {
    return this.sdk.options.network;
  }

  url() {
    return this.sdk.options.rpcUrl;
  }

  async address() {
    const [{ address }] = await this.sdk.options.wallet.getAccounts();

    return address;
  }

  async txResult(hash) {
    return await this.sdk.signer.getTx(hash);
  }

  async balanceOf(address) {
    const { amount } = await this.sdk.signer.getBalance(address, 'ncheq');

    return BigInt(amount);
  }

  methods() {
    return ['cheqd', 'dock'];
  }

  // eslint-disable-next-line
  supportsIdentifier(id) {
    const network = this.network();

    if (id instanceof NamespaceDid) {
      if (id.isCheqd) {
        if (id.asCheqd.isTestnet) {
          return network === CheqdNetwork.Testnet;
        } else if (id.asCheqd.isMainnet) {
          return network === CheqdNetwork.Mainnet;
        }
      }
    } else if (id instanceof DidRef) {
      return this.supportsIdentifier(id[0]);
    } else if (id instanceof TypedEnum) {
      return this.supportsIdentifier(id.value);
    } else if (String(id).includes(`:cheqd:${network}:`)) {
      return true;
    }

    // Dock identifiers
    if (id instanceof NamespaceDid) {
      return id.isDock;
    } else if (id instanceof DockDidOrDidMethodKey) {
      return id.isDock;
    } else if (id instanceof DidRef) {
      return this.supportsIdentifier(id[0]);
    } else if (id instanceof TypedEnum) {
      return this.supportsIdentifier(id.value);
    } else if (String(id).includes(':dock:')) {
      return true;
    }

    return false;
  }
}

export { CheqdNetwork };
