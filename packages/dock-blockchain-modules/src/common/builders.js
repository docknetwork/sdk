import {
  withExtendedStaticProperties,
  ensureInstanceOf,
} from '@docknetwork/credential-sdk/utils';
import { DockDidOrDidMethodKey } from '@docknetwork/credential-sdk/types/did';
import DidKeypair from '@docknetwork/credential-sdk/keypairs/did-keypair';

const fnNameToMethodName = (methodName) => `${methodName[0].toUpperCase()}${methodName.slice(1)}`;

export const ensureTargetKeypair = (targetDid, didKeypair) => {
  const includes = []
    .concat(didKeypair)
    .some(
      (keyPair) => String(ensureInstanceOf(keyPair, DidKeypair).did) === String(targetDid),
    );

  if (!includes) {
    throw new Error(`No keypair provided for ${targetDid}`);
  }
};

/**
 * Creates DID method transaction with policy builder.
 */
export const createDIDMethodWithPolicyTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;

      const [didKeypair] = args.slice(root.payload[fnName].length - 2);
      const { did: signer } = ensureInstanceOf(didKeypair, DidKeypair);

      const signStateChange = async (maybeDidNonce) => {
        // eslint-disable-next-line no-param-reassign
        args[root.payload[fnName].length - 1] ??= maybeDidNonce.inc();

        const { data, nonce } = root.payload[fnName].apply(this.root, args);

        const sig = await DockDidOrDidMethodKey.from(signer).signStateChange(
          root.apiProvider,
          root.constructor.MethodNameOverrides?.[fnName]
            ?? fnNameToMethodName(fnName),
          { data, nonce },
          didKeypair,
        );

        return await root.rawTx[fnName](data, [{ sig, nonce }]);
      };

      if (args[root.payload[fnName].length - 1] == null) {
        return await root.apiProvider.withDidNonce(
          didKeypair.did,
          signStateChange,
        );
      } else {
        return await signStateChange();
      }
    },
  };

  return obj[fnName];
};

/**
 * Creates DID method transaction builder.
 */
export const createDIDMethodTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;

      const [didKeypair] = args.slice(root.payload[fnName].length - 2);
      ensureInstanceOf(didKeypair, DidKeypair);

      const changeState = async (maybeDidNonce) => {
        // eslint-disable-next-line no-param-reassign
        args[root.payload[fnName].length - 1] ??= maybeDidNonce.inc();

        return await DockDidOrDidMethodKey.from(didKeypair.did).changeState(
          root.apiProvider,
          root.rawTx[fnName],
          root.constructor.MethodNameOverrides?.[fnName]
            ?? fnNameToMethodName(fnName),
          root.payload[fnName].apply(this.root, args),
          didKeypair,
        );
      };

      if (args[root.payload[fnName].length - 1] == null) {
        return await root.apiProvider.withDidNonce(didKeypair.did, changeState);
      } else {
        return await changeState();
      }
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
 * Creates a call which accepts nonce as last argument.
 */
export const createCallWithNonce = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;
      const tx = await root.tx[fnName](
        ...args.slice(0, root.payload[fnName].length - 1),
      );

      return await root.signAndSend(tx, args[root.payload[fnName].length - 1]);
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

export function createInternalDockModule(
  {
    didMethods = Object.create(null),
    didMethodsWithPolicy = Object.create(null),
    accountMethods = Object.create(null),
  } = {},
  baseClass = class DockModuleBaseClass {},
) {
  const name = `internalDockModule(${baseClass.name})`;
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

      get query() {
        return this.apiProvider.api.query[this.constructor.Prop];
      }

      get rawTx() {
        return this.apiProvider.api.tx[this.constructor.Prop];
      }

      get rpc() {
        return this.apiProvider.api.rpc[this.constructor.Prop];
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

  for (const [key, payload] of Object.entries(didMethodsWithPolicy)) {
    RootPayload.prototype[key] = payload;
    RootModule.prototype[key] = createDIDMethodWithPolicyTx(key);
    RootSender.prototype[key] = createCallWithNonce(key);
  }

  for (const [key, payload] of Object.entries(didMethods)) {
    RootPayload.prototype[key] = payload;
    RootModule.prototype[key] = createDIDMethodTx(key);
    RootSender.prototype[key] = createCallWithNonce(key);
  }

  for (const [key, payload] of Object.entries(accountMethods)) {
    RootPayload.prototype[key] = payload;
    RootModule.prototype[key] = createAccountTx(key);
    RootSender.prototype[key] = createCall(key);
  }

  return withExtendedStaticProperties(['Prop'], obj[name]);
}
