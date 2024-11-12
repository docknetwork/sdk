import {
  TypedMap,
  TypedNumber,
  option,
} from '@docknetwork/credential-sdk/types/generic';
import {
  stringToU8a,
  maybeToJSONString,
  u8aToString,
} from '@docknetwork/credential-sdk/utils';
import { createInternalCheqdModule } from './builders';
import { CheqdCreateResource } from './payload';

const methods = {
  addParams: (id, params, did) => new CheqdCreateResource(
    did.value.value,
    id,
    '1.0',
    [],
    'OffchainParams',
    'offchain-signature-params',
    stringToU8a(maybeToJSONString(params)),
  ),
};

export default function injectParams(klass) {
  return class extends createInternalCheqdModule(methods, klass) {
    static Prop = 'resource';

    static get MsgNames() {
      const names = super.MsgNames ?? {};

      return {
        ...names,
        addParams: 'MsgCreateResource',
      };
    }

    static get ParamsMap() {
      const { Params } = this;

      return class ParamsMap extends TypedMap {
        static KeyClass = TypedNumber;

        static ValueClass = Params;
      };
    }

    /**
     * Retrieves params by DID and counter.
     * @param {*} did
     * @param {*} counter
     * @returns {Promise<Params>}
     */
    async getParams(did, id) {
      const bytes = (await this.resource(did, id))?.resource?.data;

      return option(this.constructor.Params).from(
        bytes && JSON.parse(u8aToString(bytes)),
      );
    }

    /**
     * Retrieves all params by a DID.
     * @param {*} did
     * @returns {Promise<Map<TypedNumber, Params>>}
     */
    async getAllParamsByDid(did) {
      const resources = await this.resourcesBy(did, this.filterMetadata);

      return new this.constructor.ParamsMap(
        [...resources].map(([key, item]) => [key, item.resource.data]),
      );
    }
  };
}
