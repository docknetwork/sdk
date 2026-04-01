import { TypedMap } from '@docknetwork/credential-sdk/types/generic';
import { withExtendedStaticProperties } from '@docknetwork/credential-sdk/utils';
import { CheqdCreateResource } from '@docknetwork/credential-sdk/types';
import createInternalCheqdModule from './create-internal-cheqd-module';
import { validateResource } from './resource';

const methods = {
  addParams(id, params, did) {
    const {
      ParamsName, ParamsType, Params, ParamsId,
    } = this.constructor;

    return new CheqdCreateResource(
      this.types.Did.from(did).value.value,
      ParamsId.from(id),
      '1.0',
      [],
      ParamsName,
      ParamsType,
      Params.from(params).toJSONStringBytes(),
    );
  },
};

export default function injectParams(klass) {
  const name = `injectParams(${klass.name})`;

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
        const { Params, ParamsId } = this;

        return class ParamsMap extends TypedMap {
          static KeyClass = ParamsId;

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
        const {
          ParamsName, ParamsType, Params, ParamsId,
        } = this.constructor;
        const item = await this.resource(did, ParamsId.from(id));
        if (item == null) {
          return null;
        }

        return Params.from(validateResource(item, ParamsName, ParamsType));
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<ParamsId, Params>>}
       */
      async getAllParamsByDid(did) {
        const { ParamsName, ParamsType } = this.constructor;

        const resources = await this.resourcesBy(
          did,
          this.filterParamsMetadata,
        );

        return new this.constructor.ParamsMap(
          [...resources].map(([key, item]) => [
            key,
            validateResource(item, ParamsName, ParamsType),
          ]),
        );
      }

      filterParamsMetadata(meta) {
        return meta.resourceType === this.constructor.ParamsType;
      }
    },
  };

  return withExtendedStaticProperties(
    ['Params', 'ParamsId', 'ParamsName', 'ParamsType'],
    obj[name],
  );
}
