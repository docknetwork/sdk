import { DockDidOrDidMethodKey } from '@docknetwork/credential-sdk/types';
import { withExtendedStaticProperties } from '@docknetwork/credential-sdk/utils';
import {
  TypedMap,
  TypedNumber,
  option,
} from '@docknetwork/credential-sdk/types/generic';
import createInternalDockModule from './create-internal-dock-module';

const didMethods = {
  addParams(params, _, __, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.AddParams(
      this.constructor.Params.from(params),
      nonce,
    );
  },
  removeParams(paramsId, did, __, nonce) {
    return new this.constructor.PublicKeyAndParamsActions.RemoveParams(
      [did, paramsId],
      nonce,
    );
  },
};

export default function injectParams(klass) {
  const name = `withInternalParams(${klass.name})`;

  const obj = {
    [name]: class extends createInternalDockModule({ didMethods }, klass) {
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
        return option(this.constructor.Params).from(
          await this.query[this.constructor.ParamsQuery](
            DockDidOrDidMethodKey.from(did),
            TypedNumber.from(id),
          ),
        );
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<TypedNumber, Params>>}
       */
      async getAllParamsByDid(did) {
        // TODO: use `multi`
        const hexDid = DockDidOrDidMethodKey.from(did);
        const paramsMap = new this.constructor.ParamsMap();

        const paramsCounter = await this.lastParamsId(hexDid);
        for (let idx = 1; idx <= paramsCounter; idx++) {
          // eslint-disable-next-line no-await-in-loop
          const params = await this.getParams(hexDid, idx);

          if (params != null) {
            paramsMap.set(idx, params);
          }
        }

        return paramsMap;
      }

      async lastParamsId(_did) {
        throw new Error('Unimplemented');
      }
    },
  };

  return withExtendedStaticProperties(['Params', 'ParamsQuery'], obj[name]);
}
