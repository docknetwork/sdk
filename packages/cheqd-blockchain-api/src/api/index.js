import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import {
  maybeToJSONString,
  fmtIterable,
  extendNull,
  maybeToCheqdPayloadOrJSON,
  retry,
  u8aToHex,
  minBigInt,
} from '@docknetwork/credential-sdk/utils';
import { sha256 } from 'js-sha256';
import {
  DIDModule,
  ResourceModule,
  createCheqdSDK,
  CheqdNetwork,
  FeemarketModule,
  // eslint-disable-next-line no-unused-vars
  CheqdSDK,
} from '@cheqd/sdk';
import {
  MsgCreateDidDocPayload,
  MsgUpdateDidDocPayload,
  MsgDeactivateDidDocPayload,
} from '@cheqd/ts-proto/cheqd/did/v2/index.js';
import { MsgCreateResourcePayload } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
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
import { buildTypeUrlObject, fullTypeUrl, fullTypeUrls } from './type-url';
import {
  createOrUpdateDIDDocGas,
  createResourceGas,
  deactivateDIDDocGas,
  gasAmountForBatch,
} from './gas';

export class CheqdAPI extends AbstractApiProvider {
  #sdk;

  #spawn;

  /**
   * Creates a new instance of the CheqdAPI object, call init to initialize
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * @returns {CheqdSDK}
   */
  get sdk() {
    return this.ensureInitialized().#sdk;
  }

  static Fees = buildTypeUrlObject(
    DIDModule.fees.DefaultCreateDidDocFee,
    DIDModule.fees.DefaultUpdateDidDocFee,
    DIDModule.fees.DefaultDeactivateDidDocFee,
    ResourceModule.fees.DefaultCreateResourceDefaultFee,
  );

  static BaseGasAmounts = buildTypeUrlObject(
    createOrUpdateDIDDocGas,
    createOrUpdateDIDDocGas,
    deactivateDIDDocGas,
    createResourceGas,
  );

  static Payloads = buildTypeUrlObject(
    [CheqdDIDDocument, MsgCreateDidDocPayload],
    [CheqdDIDDocument, MsgUpdateDidDocPayload],
    [CheqdDeactivateDidDocument, MsgDeactivateDidDocPayload],
    [CheqdCreateResource, MsgCreateResourcePayload],
  );

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
  static async payloadToBytes(method, payload) {
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
  async init({ url, wallet, network } = {}) {
    if (network !== CheqdNetwork.Mainnet && network !== CheqdNetwork.Testnet) {
      throw new Error(
        `Invalid network provided: \`${network}\`, expected one of \`${fmtIterable(
          Object.values(CheqdNetwork),
        )}\``,
      );
    } else if (wallet == null) {
      throw new Error('`wallet` must be provided');
    }

    this.ensureNotInitialized();
    const options = {
      modules: [DIDModule, ResourceModule, FeemarketModule],
      rpcUrl: url,
      wallet,
      network,
    };
    const sdk = await createCheqdSDK(options);

    this.ensureNotInitialized();
    this.#sdk = sdk;
    this.#spawn = pLimit(1);

    return this;
  }

  /**
   * @returns {Promise<this>}
   */
  async disconnect() {
    this.ensureInitialized();
    this.#sdk = void 0;
    this.#spawn = void 0;

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
  async estimateGas(txOrTxs) {
    const { BaseGasAmounts, BlockLimits } = this.constructor;

    const txs = this.constructor.txToJSON(txOrTxs);
    const limit = BlockLimits[this.network()];

    const estimated = txs.reduce(
      (total, { typeUrl, value }) => minBigInt(total + BigInt(BaseGasAmounts[typeUrl](value)), limit),
      0n,
    );

    return String(gasAmountForBatch(estimated, txs.length));
  }

  /**
   * Calculate fee for the provided transaction(s).
   *
   * @param {object|Array<object>} txOrTxs
   * @returns {BigInt}
   */
  calculateFee(txOrTxs) {
    const { Fees } = this.constructor;

    const amount = fullTypeUrls(txOrTxs).reduce(
      (total, typeUrl) => total + BigInt(Fees[typeUrl].amount),
      0n,
    );

    return {
      amount: String(amount),
      denom: 'ncheq',
    };
  }

  /**
   * Converts payload of the supplied method to bytes.
   *
   * @param {string} method
   * @param {object} payload
   * @returns {Promise<Uint8Array>}
   */
  async stateChangeBytes(method, payload) {
    return await this.constructor.payloadToBytes(method, payload);
  }

  /**
   * Signs and broadcasts transaction using underlying `sdk.signer.signAndBroadcast` but retries in case of specific errors.
   *
   * @param {string} sender
   * @param {Array<object>} txJSON
   * @param {object} payment
   * @param {?string} memo
   * @returns {Promise<object>}
   */
  async signAndBroadcast(sender, txJSON, { ...payment }, memo) {
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
      } else if (strErr.includes('exists')) {
        const { bodyBytes } = await this.sdk.signer.sign(
          sender,
          txJSON,
          payment,
          memo ?? '',
        );
        const hash = u8aToHex(sha256.digest(bodyBytes)).slice(2).toUpperCase();

        return await this.txResult(hash);
      } else if (strErr.includes('out of gas in location')) {
        const gasAmount = BigInt(payment.gas);
        const limit = BlockLimits[this.network()];
        if (gasAmount >= limit) {
          throw new Error(
            "Can't process transaction because it exceeds block gas limit",
          );
        }

        // eslint-disable-next-line no-param-reassign
        payment.gas = String(minBigInt(gasAmount * 2n, limit));
        return continueSym;
      } else if (strErr.includes('account sequence mismatch')) {
        return continueSym;
      }

      throw err;
    };

    return await this.#spawn(() => retry(
      async () => {
        const res = await this.sdk.signer.signAndBroadcast(
          sender,
          txJSON,
          payment,
          memo ?? '',
        );

        if (res.code) {
          console.error(res);

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
    from, fee, memo, gas,
  } = {}) {
    const sender = from ?? (await this.address());
    const txJSON = this.constructor.txToJSON(tx);

    const payment = {
      amount: [].concat(fee ?? this.calculateFee(tx)),
      gas: gas ?? (await this.estimateGas(tx)),
      payer: sender,
    };

    return await this.signAndBroadcast(sender, txJSON, payment, memo);
  }

  async reconnect() {
    const {
      sdk: {
        options: { rpcUrl, network, wallet },
      },
    } = this.ensureInitialized();

    return await retry(
      async () => {
        try {
          await this.disconnect();
        } catch (error) {
          console.error(error);
        }

        return await this.init({
          url: rpcUrl,
          network,
          wallet,
        });
      },
      { delay: 5e2, timeLimit: 1e4 },
    );
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
