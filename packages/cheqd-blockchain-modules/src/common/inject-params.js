import { TypedMap } from '@docknetwork/credential-sdk/types/generic';
import {
  withExtendedStaticProperties,
  u8aToString,
} from '@docknetwork/credential-sdk/utils';
import {
  CheqdParamsId,
  CheqdCreateResource,
} from '@docknetwork/credential-sdk/types';
import createInternalCheqdModule from './create-internal-cheqd-module';
import { validateResource } from './resource';

const methods = {
  addParams(id, params, did) {
    return new CheqdCreateResource(
      did.value.value,
      id,
      '1.0',
      [],
      this.constructor.ParamsName,
      this.constructor.ParamsType,
      this.constructor.Params.from(params).toJSONStringBytes(),
    );
  },
};

export default function injectParams(klass) {
  const name = `withInternalParams(${klass.name})`;

  const obj = {
    [name]: class extends createInternalCheqdModule(methods, klass) {
      constructor(...args) {
        super(...args);

        this.filterParamsMetadata = this.filterParamsMetadata.bind(this);
      }

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
          static KeyClass = CheqdParamsId;

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
        const { ParamsName, ParamsType } = this.constructor;
        const item = await this.resource(did, id);
        if (item == null) {
          return null;
        }

        return this.constructor.Params.from(
          JSON.parse(
            u8aToString(validateResource(item, ParamsName, ParamsType)),
          ),
        );
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<CheqdParamsId, Params>>}
       */
      async getAllParamsByDid(did) {
        const { ParamsMap, ParamsName, ParamsType } = this.constructor;
        const resources = await this.resourcesBy(
          did,
          this.filterParamsMetadata,
        );

        return new ParamsMap(
          [...resources].map(([key, item]) => [
            key,
            JSON.parse(
              u8aToString(validateResource(item, ParamsName, ParamsType)),
            ),
          ]),
        );
      }

      filterParamsMetadata(meta) {
        return meta.resourceType === this.constructor.ParamsType;
      }
    },
  };

  return withExtendedStaticProperties(
    ['Params', 'ParamsName', 'ParamsType'],
    obj[name],
  );
}
