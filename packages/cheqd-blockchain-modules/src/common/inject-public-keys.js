import { TypedMap } from '@docknetwork/credential-sdk/types/generic';
import {
  u8aToString,
  withExtendedStaticProperties,
} from '@docknetwork/credential-sdk/utils';
import {
  CheqdPublicKeyId,
  CheqdCreateResource,
} from '@docknetwork/credential-sdk/types';
import createInternalCheqdModule from './create-internal-cheqd-module';
import { validateResource } from './resource';

const methods = {
  addPublicKey(id, publicKey, did) {
    return new CheqdCreateResource(
      did.value.value,
      id,
      '1.0',
      [],
      this.constructor.PublicKeyName,
      this.constructor.PublicKeyType,
      this.constructor.PublicKey.from(publicKey).toJSONStringBytes(),
    );
  },
};

export default function injectPublicKeys(klass) {
  const name = `withInternalPublicKeys(${klass.name})`;

  const obj = {
    [name]: class extends createInternalCheqdModule(methods, klass) {
      constructor(...args) {
        super(...args);

        this.filterPublicKeyMetadata = this.filterPublicKeyMetadata.bind(this);
      }

      static get MsgNames() {
        const names = super.MsgNames ?? {};

        return {
          ...names,
          addPublicKey: 'MsgCreateResource',
        };
      }

      static get PublicKeyMap() {
        const { PublicKey } = this;

        return class PublicKeyMap extends TypedMap {
          static KeyClass = CheqdPublicKeyId;

          static ValueClass = PublicKey;
        };
      }

      /**
       * Retrieves params by DID and counter.
       * @param {*} did
       * @param {*} counter
       * @returns {Promise<PublicKey>}
       */
      async getPublicKey(did, id, includeParams = false) {
        const { PublicKey, PublicKeyType, PublicKeyName } = this.constructor;
        const item = await this.resource(did, id);
        if (item == null) {
          return null;
        }

        const publicKey = PublicKey.from(
          JSON.parse(
            u8aToString(validateResource(item, PublicKeyName, PublicKeyType)),
          ),
        );
        if (includeParams) {
          return await publicKey.withParams(this);
        } else {
          return publicKey;
        }
      }

      /**
       * Retrieves all params by a DID.
       * @param {*} did
       * @returns {Promise<Map<CheqdPublicKeyId, PublicKey>>}
       */
      async getAllPublicKeysByDid(did, includeParams = false) {
        const { PublicKeyMap } = this.constructor;

        const metas = await this.resourcesMetadataBy(
          did,
          this.filterPublicKeyMetadata,
        );

        return new PublicKeyMap(
          await Promise.all(
            metas.map(({ id }) => this.getPublicKey(did, id, includeParams)),
          ),
        );
      }

      filterPublicKeyMetadata(meta) {
        return meta.resourceType === this.constructor.PublicKeyType;
      }
    },
  };

  return withExtendedStaticProperties(
    ['PublicKey', 'PublicKeyName', 'PublicKeyType'],
    obj[name],
  );
}
