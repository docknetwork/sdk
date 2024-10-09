import { TypedNumber } from '@docknetwork/credential-sdk/types/generic';
import {
  DockDidOrDidMethodKey,
  OffchainSignatureParams,
  DockOffchainSignaturePublicKey,
  DockDidValue,
} from '@docknetwork/credential-sdk/types';
import { ParamsAndPublicKeys } from '../common';
import {
  AddOffchainSignatureParams,
  AddOffchainSignaturePublicKey,
  RemoveOffchainSignatureParams,
  RemoveOffchainSignaturePublicKey,
} from './actions';
import { DockDIDModuleInternal } from '../did/internal';

export default class DockInternalOffchainSignaturesModule extends ParamsAndPublicKeys {
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

  static Params = OffchainSignatureParams;

  static ParamsQuery = 'signatureParams';

  static PublicKeyQuery = 'publicKeys';

  static PublicKeyOwner = DockDidValue;

  /**
   * Returns params counter corresponding to the supplied DID.
   * @param {*} did
   * @returns Promise<*>
   */
  async paramsCounter(did) {
    return TypedNumber.from(
      await this.query.paramsCounter(DockDidOrDidMethodKey.from(did)),
    );
  }

  /**
   * Returns keys counter corresponding to the supplied DID.
   * @param {*} did
   * @returns Promise<*>
   */
  async keysCounter(did) {
    return (
      await new DockDIDModuleInternal(this.apiProvider).getOnchainDidDetail(
        DockDidOrDidMethodKey.from(did),
      )
    ).lastKeyId;
  }
}
