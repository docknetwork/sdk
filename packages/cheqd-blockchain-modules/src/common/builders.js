import {
  VerificationMethodSignature,
  CheqdDid,
} from '@docknetwork/credential-sdk/types';
import { TypedUUID } from '@docknetwork/credential-sdk/types/generic';
import { CheqdPayloadWithTypeUrl } from './payload';

/**
 * Creates DID method transaction builder.
 */
export const createDIDMethodTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;

      const [didKeypairs] = args.slice(-1);

      const payload = root.payload[fnName].apply(this.root, args);
      const bytes = await root.apiProvider.stateChangeBytes(
        root.constructor.MsgNames[fnName],
        payload,
      );

      const signatures = []
        .concat(didKeypairs)
        .map((didKeypair) => VerificationMethodSignature.fromDidKeypair(didKeypair, bytes));

      const value = {
        payload,
        signatures,
      };

      return new CheqdPayloadWithTypeUrl(
        root.constructor.MsgNames[fnName],
        value,
      );
    },
  };

  return obj[fnName];
};

/**
 * Creates a call.
 */
export const createCall = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;
      const tx = await root.tx[fnName](
        ...args.slice(0, root.payload[fnName].length),
      );

      return await root.signAndSend(tx, args[root.payload[fnName].length]);
    },
  };

  return obj[fnName];
};

/**
 * Creates a transaction builder for account method with the given name.
 */
export const createAccountTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      return await this.root.rawTx[fnName](
        ...this.root.payload[fnName].apply(this.root, args),
      );
    },
  };

  return obj[fnName];
};

class Root {
  constructor(root) {
    this.root = root;
  }
}

/* eslint-disable sonarjs/cognitive-complexity */
export function createInternalCheqdModule(
  methods = Object.create(null),
  baseClass = class CheqdModuleBaseClass {},
) {
  const name = `internalCheqdModule(${baseClass.name})`;
  class RootPayload extends (baseClass.RootPayload ?? Root) {}
  class RootModule extends (baseClass.RootModule ?? Root) {}
  class RootSender extends (baseClass.RootSender ?? Root) {}

  const obj = {
    [name]: class extends baseClass {
      static Prop;

      static RootPayload = RootPayload;

      static RootModule = RootModule;

      static RootSender = RootSender;

      constructor(apiProvider) {
        super(apiProvider);

        this.apiProvider = apiProvider;
      }

      async resourcesBy(did, cond) {
        const ids = await this.resourcesMetadataBy(did, cond);

        try {
          const queries = ids.map(async id => [id, await this.apiProvider.sdk.querier.resource.resource(
            did,
            id,
          )]);

          return new Map(await Promise.all(queries));
        } catch (err) {
          if (!String(err).includes('DID Doc not found')) {
            throw err;
          }
        }

        return new Map();
      }

      async resource(did, id) {
        const strDid = CheqdDid.from(did).toEncodedString();
        const strID = String(TypedUUID.from(id));

        try {
          return await this.apiProvider.sdk.querier.resource.resource(
            strDid,
            strID,
          );
        } catch (err) {
          if (!String(err).includes('DID Doc not found')) {
            throw err;
          }
        }

        return null;
      }

      async resourcesMetadataBy(did, cond, stop = (_) => false) {
        let res = [];
        let resources;
        let paginationKey;
        const encodedDid = CheqdDid.from(did).toEncodedString();

        do {
          try {
            // eslint-disable-next-line operator-linebreak
            ({ resources, paginationKey } =
              // eslint-disable-next-line no-await-in-loop
              await this.apiProvider.sdk.querier.resource.collectionResources(
                encodedDid,
                paginationKey,
              ));
          } catch (err) {
            if (!String(err).includes('DID Doc not found')) {
              throw err;
            } else {
              break;
            }
          }

          res = res.concat(resources.filter(cond));
        } while (!stop(res) && paginationKey != null);

        return res;
      }

      async latestResourcesMetadataBy(did, cond) {
        return await this.resourcesMetadataBy(did, meta => cond(meta) && !meta.nextVersionId);
      }

      async latestResourceMetadataBy(did, cond) {
        const meta = await this.resourcesMetadataBy(did, meta => cond(meta) && !meta.nextVersionId, res => res.length);

        return meta[0] ?? null;
      }

      get query() {
        return this.apiProvider.sdk.querier[this.constructor.Prop];
      }

      get tx() {
        return new RootModule(this);
      }

      get send() {
        return new RootSender(this);
      }

      get payload() {
        return new RootPayload(this);
      }

      async signAndSend(extrinsic, params) {
        return await this.apiProvider.signAndSend(extrinsic, params);
      }
    },
  };

  for (const [key, payload] of Object.entries(methods)) {
    RootPayload.prototype[key] = payload;
    RootModule.prototype[key] = createDIDMethodTx(key);
    RootSender.prototype[key] = createCall(key);
  }

  return obj[name];
}
