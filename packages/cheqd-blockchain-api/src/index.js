import { ApiProvider } from '@docknetwork/credential-sdk/modules/common';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { DIDModule, ResourceModule, createCheqdSDK } from '@cheqd/sdk';
import {
  MsgCreateDidDocPayload,
  MsgUpdateDidDocPayload,
  MsgDeactivateDidDocPayload,
  protobufPackage as didProtobufPackage,
} from '@cheqd/ts-proto/cheqd/did/v2/index';
import {
  MsgCreateResourcePayload,
  protobufPackage as resourceProtobufPackage,
} from '@cheqd/ts-proto/cheqd/resource/v2/index';

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

  async init({ url, mnemonic }) {
    const options = {
      modules: [DIDModule, ResourceModule],
      rpcUrl: url,
      wallet:
        mnemonic
        && (await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: 'cheqd',
        })),
    };

    this.sdk = await createCheqdSDK(options);

    return this;
  }

  async disconnect() {
    delete this.sdk;
  }

  async signAndSend(tx, { from, fee, memo } = {}) {
    const sender = from ?? (await this.sdk.options.wallet.getAccounts())[0].address;
    const { typeUrl } = tx;

    const prefix = this.constructor.Prefixes[typeUrl];
    const amount = fee ?? this.constructor.Fees[typeUrl];
    const payment = {
      amount: [amount],
      gas: '3600000', // TODO: dynamically calculate needed amount
      payer: sender,
    };

    const txJSON = tx.toJSON();
    txJSON.typeUrl = `/${prefix}.${typeUrl}`;

    const res = await this.sdk.signer.signAndBroadcast(
      sender,
      [txJSON],
      payment,
      memo ?? '',
    );

    if (res.code) {
      console.error(res);

      throw new Error(`Error: ${JSON.stringify(res)}`);
    }

    return res;
  }

  async stateChangeBytes(method, payload) {
    const { [method]: Payload } = this.constructor.Payloads;
    if (Payload == null) {
      throw new Error(
        `Can't find payload constructor for the provided method \`${method}\``,
      );
    }
    const jsonPayload = payload.toJSON();
    const sdkPayload = Payload.fromPartial(jsonPayload);

    try {
      return Payload.encode(sdkPayload).finish();
    } catch (err) {
      throw new Error(
        `Failed to encode payload \`${JSON.stringify(sdkPayload)}\`: ${err}`,
      );
    }
  }
}
