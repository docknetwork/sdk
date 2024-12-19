import { AbstractApiProvider } from '@docknetwork/credential-sdk/modules/abstract/common';
import {
  maybeToJSONString,
  fmtIter,
  extendNull,
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
} from '@docknetwork/credential-sdk/types';
import { TypedEnum } from '@docknetwork/credential-sdk/types/generic';
import { maybeToCheqdPayloadOrJSON } from '../../credential-sdk/src/utils';

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

  /**
   * Initializes `CheqdAPI` with the supplied url, wallet and network type.
   * @param {object} configuration
   * @param {string} [configuration.url]
   * @param {*} [configuration.wallet]
   * @param {string} [configuration.network]
   * @returns {this}
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
  async signAndSend(tx, { from, fee, memo } = {}) {
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
      gas: '3600000', // TODO: dynamically calculate needed amount
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

  methods() {
    return ['cheqd'];
  }

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

    return false;
  }
}

export { CheqdNetwork };
