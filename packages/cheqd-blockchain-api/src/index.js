import { ApiProvider } from "@docknetwork/credential-sdk/modules/abstract/common";
import {
  maybeToJSON,
  maybeToJSONString,
} from "@docknetwork/credential-sdk/utils";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { DIDModule, ResourceModule, createCheqdSDK } from "@cheqd/sdk";
import {
  MsgCreateDidDocPayload,
  MsgUpdateDidDocPayload,
  MsgDeactivateDidDocPayload,
  protobufPackage as didProtobufPackage,
} from "@cheqd/ts-proto/cheqd/did/v2/index";
import {
  MsgCreateResourcePayload,
  protobufPackage as resourceProtobufPackage,
} from "@cheqd/ts-proto/cheqd/resource/v2/index";
import { CheqdNetwork } from "@cheqd/sdk";
import { fmtIter } from "@docknetwork/credential-sdk/utils";
import { DIDRef, NamespaceDid } from "@docknetwork/credential-sdk/types";
import { TypedEnum } from "@docknetwork/credential-sdk/types/generic";

export class CheqdAPI extends ApiProvider {
  /**
   * Creates a new instance of the CheqdAPI object, call init to initialize
   * @constructor
   */
  constructor() {
    super();
  }

  static Fees = {
    MsgCreateDidDoc: DIDModule.fees.DefaultCreateDidDocFee,
    MsgUpdateDidDoc: DIDModule.fees.DefaultUpdateDidDocFee,
    MsgDeactivateDidDoc: DIDModule.fees.DefaultDeactivateDidDocFee,
    MsgCreateResource: ResourceModule.fees.DefaultCreateResourceDefaultFee,
  };

  static Prefixes = {
    MsgCreateDidDoc: didProtobufPackage,
    MsgUpdateDidDoc: didProtobufPackage,
    MsgDeactivateDidDoc: didProtobufPackage,
    MsgCreateResource: resourceProtobufPackage,
  };

  static Payloads = {
    MsgCreateDidDoc: MsgCreateDidDocPayload,
    MsgUpdateDidDoc: MsgUpdateDidDocPayload,
    MsgDeactivateDidDoc: MsgDeactivateDidDocPayload,
    MsgCreateResource: MsgCreateResourcePayload,
  };

  /**
   * Initializes `CheqdAPI` with the supplied url and mnemonic.
   * @param {object} configuration
   * @param {string} [configuration.url]
   * @param {string} [configuration.mnemonic]
   * @returns {this}
   */
  async init({ url, mnemonic, network } = {}) {
    if (network !== CheqdNetwork.Mainnet && network !== CheqdNetwork.Testnet) {
      throw new Error(
        `Invalid network provided: \`${network}\`, expected one of \`${fmtIter(
          Object.values(CheqdNetwork)
        )}\``
      );
    }

    this.ensureNotInitialized();
    const wallet =
      mnemonic &&
      (await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: "cheqd",
      }));
    const options = {
      modules: [DIDModule, ResourceModule],
      rpcUrl: url,
      wallet,
      network,
    };
    const sdk = await createCheqdSDK(options);

    this.ensureNotInitialized().sdk = sdk;

    return this;
  }

  /**
   * @returns {void}
   */
  async disconnect() {
    delete this.sdk;
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
    const { [method]: Payload } = this.constructor.Payloads;
    if (Payload == null) {
      throw new Error(
        `Can't find payload constructor for the provided method \`${method}\``
      );
    }
    const jsonPayload = maybeToJSON(payload);
    const sdkPayload = Payload.fromPartial(jsonPayload);

    try {
      return Payload.encode(sdkPayload).finish();
    } catch (err) {
      throw new Error(
        `Failed to encode payload \`${maybeToJSONString(sdkPayload)}\`: ${err}`
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
    const sender =
      from ?? (await this.sdk.options.wallet.getAccounts())[0].address;
    const { typeUrl } = tx;

    const prefix = this.constructor.Prefixes[typeUrl];
    const amount = fee ?? this.constructor.Fees[typeUrl];
    const payment = {
      amount: [amount],
      gas: "3600000", // TODO: dynamically calculate needed amount
      payer: sender,
    };

    const txJSON = tx.toJSON();
    txJSON.typeUrl = `/${prefix}.${typeUrl}`;

    const res = await this.sdk.signer.signAndBroadcast(
      sender,
      [txJSON],
      payment,
      memo ?? ""
    );

    if (res.code) {
      console.error(res);

      throw new Error(
        JSON.stringify(res, (_, value) =>
          typeof value === "bigint" ? `${value.toString()}n` : value
        )
      );
    }

    return res;
  }

  supportsIdentifier(id) {
    this.ensureInitialized();

    if (id instanceof NamespaceDid) {
      if (id.isCheqd) {
        if (id.asCheqd.isTestnet) {
          return this.network === CheqdNetwork.Testnet;
        } else if (id.asCheqd.isMainnet) {
          return this.network === CheqdNetwork.Mainnet;
        }
      }
    } else if (id instanceof DIDRef) {
      return this.supportsIdentifier(id[0]);
    } else if (id instanceof TypedEnum) {
      return this.supportsIdentifier(this.value);
    }

    return false;
  }
}
