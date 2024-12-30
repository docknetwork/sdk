import {
  DockDidOrDidMethodKey,
  OffchainSignatureParams,
  DockOffchainSignaturePublicKey,
  DockDidValue,
  DockOffchainSignatureParamsRef,
  DockParamsId,
  DockPublicKeyId,
} from '@docknetwork/credential-sdk/types';
import {
  AddOffchainSignatureParams,
  AddOffchainSignaturePublicKey,
  RemoveOffchainSignatureParams,
  RemoveOffchainSignaturePublicKey,
} from './actions';
import injectParams from '../common/inject-params';
import injectPublicKeys from '../common/inject-public-keys';
import DockDIDModuleInternal from '../did/internal';

export default class DockInternalOffchainSignaturesModule extends injectParams(
  injectPublicKeys(class OffchainSignatures {}),
) {
  constructor(...args) {
    super(...args);

    this.didModule = new DockDIDModuleInternal(this.apiProvider);
  }

  static Prop = 'offchainSignatures';

  static MethodNameOverrides = {
    addPublicKey: 'AddOffchainSignaturePublicKey',
    removePublicKey: 'RemoveOffchainSignaturePublicKey',
    addParams: 'AddOffchainSignatureParams',
    removeParams: 'RemoveOffchainSignatureParams',
  };

  static PublicKeyAndParamsActions = {
    AddPublicKey: AddOffchainSignaturePublicKey,
    RemovePublicKey: RemoveOffchainSignaturePublicKey,
    AddParams: AddOffchainSignatureParams,
    RemoveParams: RemoveOffchainSignatureParams,
  };

  static PublicKey = DockOffchainSignaturePublicKey;

  static PublicKeyId = DockPublicKeyId;

  static ParamsId = DockParamsId;

  static Params = OffchainSignatureParams;

  static ParamsQuery = 'signatureParams';

  static ParamsRef = DockOffchainSignatureParamsRef;

  static PublicKeyQuery = 'publicKeys';

  static PublicKeyOwner = DockDidValue;

  /**
   * Returns params counter corresponding to the supplied DID.
   * @param {*} did
   * @returns Promise<DockParamsId>
   */
  async paramsCounter(did) {
    return DockParamsId.from(
      await this.query.paramsCounter(DockDidOrDidMethodKey.from(did)),
    );
  }

  async lastParamsId(did) {
    return await this.paramsCounter(did);
  }

  /**
   * Returns keys counter corresponding to the supplied DID.
   * @param {*} did
   * @returns Promise<TypedNumber>
   */
  async keysCounter(did) {
    const parsedDid = DockDidOrDidMethodKey.from(did);

    const {
      data: { lastKeyId },
    } = await this.didModule.getOnchainDidDetail(parsedDid);

    return lastKeyId;
  }

  async lastPublicKeyId(did) {
    return DockPublicKeyId.from(await this.keysCounter(did));
  }
}
