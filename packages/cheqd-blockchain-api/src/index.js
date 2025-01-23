import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import {
  maybeToJSONString,
  fmtIter,
  extendNull,
  maybeToCheqdPayloadOrJSON,
} from '@docknetwork/credential-sdk/utils';
import {
  DIDModule,
  ResourceModule,
  createCheqdSDK,
  CheqdNetwork,
} from '@cheqd/sdk';
import {
  MsgCreateDidDocPayload,
  MsgUpdateDidDocPayload,
  MsgDeactivateDidDocPayload,
  protobufPackage as didProtobufPackage,
} from '@cheqd/ts-proto/cheqd/did/v2/index.js';
import {
  MsgCreateResourcePayload,
  protobufPackage as resourceProtobufPackage,
} from '@cheqd/ts-proto/cheqd/resource/v2/index.js';
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
  CheqdTestnetOffchainSignatureParamsRef,
  CheqdTestnetOffchainSignatureKeyRef,
  CheqdMainnetOffchainSignatureParamsRef,
  CheqdMainnetOffchainSignatureKeyRef,
  CheqdTestnetAccumulator,
  CheqdMainnetAccumulator,
  DockDidOrDidMethodKey,
  CheqdMainnetVerificationMethodSignature,
  CheqdTestnetVerificationMethodSignature,
} from '@docknetwork/credential-sdk/types';
import { TypedEnum } from '@docknetwork/credential-sdk/types/generic';

export class CheqdAPI extends AbstractApiProvider {
  /**
   * Creates a new instance of the CheqdAPI object, call init to initialize
   * @constructor
   */
  constructor() {
    super();
  }

  static Fees = extendNull({
    MsgCreateDidDoc: DIDModule.fees.DefaultCreateDidDocFee,
    MsgUpdateDidDoc: DIDModule.fees.DefaultUpdateDidDocFee,
    MsgDeactivateDidDoc: DIDModule.fees.DefaultDeactivateDidDocFee,
    MsgCreateResource: ResourceModule.fees.DefaultCreateResourceDefaultFee,
  });

  static Prefixes = extendNull({
    MsgCreateDidDoc: didProtobufPackage,
    MsgUpdateDidDoc: didProtobufPackage,
    MsgDeactivateDidDoc: didProtobufPackage,
    MsgCreateResource: resourceProtobufPackage,
  });

  static Payloads = extendNull({
    MsgCreateDidDoc: [CheqdDIDDocument, MsgCreateDidDocPayload],
    MsgUpdateDidDoc: [CheqdDIDDocument, MsgUpdateDidDocPayload],
    MsgDeactivateDidDoc: [
      CheqdDeactivateDidDocument,
      MsgDeactivateDidDocPayload,
    ],
    MsgCreateResource: [CheqdCreateResource, MsgCreateResourcePayload],
  });

  static PayloadWrappers = extendNull({
    MsgCreateDidDoc: CheqdSetDidDocumentPayloadWithTypeUrlAndSignatures,
    MsgUpdateDidDoc: CheqdSetDidDocumentPayloadWithTypeUrlAndSignatures,
    MsgDeactivateDidDoc:
      CheqdCheqdDeactivateDidDocumentPayloadWithTypeUrlAndSignatures,
    MsgCreateResource: CheqdCreateResourcePayloadWithTypeUrlAndSignatures,
  });

  static Types = extendNull({
    [CheqdNetwork.Testnet]: extendNull({
      Did: CheqdTestnetDid,
      DidDocument: CheqdTestnetDIDDocument,
      Accumulator: CheqdTestnetAccumulator,
      AccumulatorId: CheqdTestnetAccumulatorId,
      AccumulatorPublicKey: CheqdTestnetAccumulatorPublicKey,
      StoredAccumulator: CheqdTestnetStoredAccumulator,
      OffchainSignatureParamsRef: CheqdTestnetOffchainSignatureParamsRef,
      OffchainSignatureKeyRef: CheqdTestnetOffchainSignatureKeyRef,
      BlobId: CheqdTestnetBlobId,
      StatusListCredentialId: CheqdTestnetStatusListCredentialId,
      VerificationMethodSignature: CheqdTestnetVerificationMethodSignature,
    }),
    [CheqdNetwork.Mainnet]: extendNull({
      Did: CheqdMainnetDid,
      DidDocument: CheqdMainnetDIDDocument,
      AccumulatorId: CheqdMainnetAccumulatorId,
      AccumulatorPublicKey: CheqdMainnetAccumulatorPublicKey,
      Accumulator: CheqdMainnetAccumulator,
      StoredAccumulator: CheqdMainnetStoredAccumulator,
      OffchainSignatureParamsRef: CheqdMainnetOffchainSignatureParamsRef,
      OffchainSignatureKeyRef: CheqdMainnetOffchainSignatureKeyRef,
      BlobId: CheqdMainnetBlobId,
      StatusListCredentialId: CheqdMainnetStatusListCredentialId,
      VerificationMethodSignature: CheqdMainnetVerificationMethodSignature,
    }),
  });

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
        `Invalid network provided: \`${network}\`, expected one of \`${fmtIter(
          Object.values(CheqdNetwork),
        )}\``,
      );
    } else if (wallet == null) {
      throw new Error('`wallet` must be provided');
    }

    this.ensureNotInitialized();
    const options = {
      modules: [DIDModule, ResourceModule],
      rpcUrl: url,
      wallet,
      network,
    };
    const sdk = await createCheqdSDK(options);

    this.ensureNotInitialized();
    this.sdk = sdk;

    return this;
  }

  /**
   * @returns {Promise<this>}
   */
  async disconnect() {
    this.ensureInitialized();
    delete this.sdk;

    return this;
  }

  /**
   * @returns {boolean}
   */
  isInitialized() {
    return this.sdk != null;
  }

  /**
   * Converts payload of the supplied method to bytes.
   *
   * @param {string} method
   * @param {object} payload
   * @returns {Promise<Uint8Array>}
   */
  async stateChangeBytes(method, payload) {
    this.ensureInitialized();
    const { [method]: Payloads } = this.constructor.Payloads;
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
    this.ensureInitialized();
    const { PayloadWrappers, Prefixes, Fees } = this.constructor;
    const { typeUrl } = tx;

    const PayloadWrapper = PayloadWrappers[typeUrl];
    const prefix = Prefixes[typeUrl];
    const amount = fee ?? Fees[typeUrl];

    if (PayloadWrapper == null) {
      throw new Error(`No payload wrapper found for \`${typeUrl}\``);
    }

    const sender = from ?? (await this.sdk.options.wallet.getAccounts())[0].address;
    const payment = {
      amount: [amount],
      gas: String(gas ?? 2e6), // TODO: dynamically calculate needed amount
      payer: sender,
    };

    const txJSON = maybeToCheqdPayloadOrJSON(PayloadWrapper.from(tx));
    txJSON.typeUrl = `/${prefix}.${typeUrl}`;

    const res = await this.sdk.signer.signAndBroadcast(
      sender,
      [txJSON],
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
  }

  types() {
    const { Types } = this.constructor;
    const { network } = this.ensureInitialized().sdk.options;

    return Types[network];
  }

  methods() {
    return ['cheqd', 'dock'];
  }

  // eslint-disable-next-line
  supportsIdentifier(id) {
    this.ensureInitialized();
    const { network } = this.sdk.options;

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
      return id.isDock || id.isDidMethodKey;
    } else if (id instanceof DockDidOrDidMethodKey) {
      return true;
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
