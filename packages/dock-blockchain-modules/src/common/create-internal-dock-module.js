import {
  withExtendedStaticProperties,
} from '@docknetwork/credential-sdk/utils';
import { DockDidOrDidMethodKey } from '@docknetwork/credential-sdk/types/did';
import { TypedNumber } from '@docknetwork/credential-sdk/types/generic';
import { allSigners, firstSigner } from './keypair';

const fnNameToMethodName = (methodName) => `${methodName[0].toUpperCase()}${methodName.slice(1)}`;

/**
 * Creates DID method transaction with policy builder.
 */
const createDIDMethodWithPolicyTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;

      const handlePayload = (maybeDidNonce) => {
        const argsClone = [...args];
        // eslint-disable-next-line no-param-reassign
        argsClone[root.payload[fnName].length - 1] ??= maybeDidNonce.inc();

        return root.payload[fnName].apply(this.root, argsClone);
      };

      const [didKeypair] = args.slice(root.payload[fnName].length - 2);
      const signers = allSigners(didKeypair);

      const { data: payload } = handlePayload(TypedNumber.from(0));

      return await root.rawTx[fnName](payload, await Promise.all(signers.map(
        async (signer) => {
          const { data, nonce } = args[root.payload[fnName].length - 1] == null
            ? await root.apiProvider.withDidNonce(signer.did, handlePayload)
            : handlePayload();

          const sig = await DockDidOrDidMethodKey.from(signer.did).signStateChange(
            root.apiProvider,
            root.constructor.MethodNameOverrides?.[fnName]
              ?? fnNameToMethodName(fnName),
            { data, nonce },
            signer,
          );

          return { sig, nonce };
        },
      )));
    },
  };

  return obj[fnName];
};

/**
 * Creates DID method transaction builder.
 */
const createDIDMethodTx = (fnName) => {
  const obj = {
    async [fnName](...args) {
      const { root } = this;

      const [didKeypair] = args.slice(root.payload[fnName].length - 2);
      const signer = firstSigner(didKeypair);

      // eslint-disable-next-line
      const handlePayload = (maybeDidNonce) => {
        // eslint-disable-next-line no-param-reassign
        args[root.payload[fnName].length - 1] ??= maybeDidNonce.inc();

        return root.payload[fnName].apply(this.root, args);
      };

      const payload = args[root.payload[fnName].length - 1] == null
        ? await root.apiProvider.withDidNonce(signer.did, handlePayload)
        : handlePayload();

      return await DockDidOrDidMethodKey.from(signer.did).changeState(
        root.apiProvider,
        root.rawTx[fnName],
        root.constructor.MethodNameOverrides?.[fnName]
          ?? fnNameToMethodName(fnName),
        payload,
        signer,
      );
    },
  };

  return obj[fnName];
};

/**
 * Creates a call.
 */
const createCall = (fnName) => {
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
const createCallWithNonce = (fnName) => {
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
const createAccountTx = (fnName) => {
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

export default function createInternalDockModule(
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

      supportsIdentifier(id) {
        return this.apiProvider.supportsIdentifier(id);
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
