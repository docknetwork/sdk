import { Ed25519Keypair } from "../src/keypairs";
import { AbstractDIDModule } from "../src/modules";
import AbstractApiProvider from "../src/modules/abstract/common/abstract-api-provider";
import {
  Resolver,
  ResolverRouter,
  DIDResolverWithDIDReplacement,
  WILDCARD,
  WildcardResolverRouter,
  createResolver,
  DIDResolver,
} from "../src/resolver";
import {
  CheqdTestnetDIDDocument,
  DockDid,
  DIDDocument,
  DidKey,
} from "../src/types";
import { decodeFromBase58 } from "../src/utils";

class APrefixBMethodResolver extends Resolver {
  prefix = "a";
  method = "b";

  async resolve(id) {
    return this.supports(id) ? `ab-full-${id}` : null;
  }
}

class CPrefixDMethodResolver extends Resolver {
  prefix = "c";
  method = "d";

  async resolve(id) {
    return this.supports(id) ? `cd-full-${id}` : null;
  }
}

class BMethod extends ResolverRouter {
  method = "b";
}

class APrefix extends ResolverRouter {
  prefix = "a";
}

class APrefixBMethod extends ResolverRouter {
  method = "b";
}

class APrefixBMethodResolverExtended extends Resolver {
  prefix = "a";
  method = "b";

  async resolve(id) {
    return this.supports(id) ? `ab-extended-${id}` : null;
  }
}

class APrefixCDMethod extends Resolver {
  prefix = "a";
  method = ["c", "d"];

  async resolve(id) {
    return this.supports(id) ? `a-cd-${id}` : null;
  }
}

class APrefixWildcardMethodResolver extends Resolver {
  prefix = "a";
  method = WILDCARD;

  async resolve(id) {
    return this.supports(id) ? `a-wildcard-${id}` : null;
  }
}

class WildcardPrefixBMethodResolver extends Resolver {
  prefix = WILDCARD;
  method = "b";

  async resolve(id) {
    return this.supports(id) ? `wildcard-b-${id}` : null;
  }
}

class WildcardPrefixAndMethodResolver extends Resolver {
  prefix = WILDCARD;
  method = WILDCARD;

  async resolve(id) {
    return this.supports(id) ? `wildcard-wildcard-${id}` : null;
  }
}

describe("Resolvers", () => {
  it("checks `DIDResolverWithDIDReplacement`", async () => {
    const did = "did:dock:5EbpmcZhMPPLCyP4mDwo4bNtwZBi3dZuKzz65PGk2Amnvek5";
    const document = DIDDocument.create(
      did,
      [
        new DidKey({
          ed25519: decodeFromBase58(
            "4qGHUs2Lofp8YH7EtkfUBxcA2B9A3KNHfkhwfd4mC4ZS"
          ),
        }),
      ],
      [
        did,
        "did:cheqd:testnet:ec2ffc8f-bef0-4307-b1dc-1e945aa05a04",
        "did:cheqd:testnet:13426782-8e61-4ea3-9255-20de06ef13ba",
      ]
    );

    const dummyApi = new (class Module extends AbstractDIDModule {
      methods() {
        return ["dock"];
      }

      async getDocument(_) {
        return document.toCheqd(
          CheqdTestnetDIDDocument,
          "0f6edb02-59d7-4cc2-aabd-dd205badb2d5"
        );
      }

      createDocumentTx() {}

      updateDocumentTx() {}

      removeDocumentTx() {}
    })(
      new (class Api extends AbstractApiProvider {
        methods() {
          return ["dock"];
        }
        isInitialized() {
          return true;
        }
        supportsIdentifier() {
          return true;
        }
        stateChangeBytes() {}
        signAndSend() {}
      })()
    );

    expect(
      await new DIDResolverWithDIDReplacement(dummyApi).resolve(String(did))
    ).toMatchSnapshot();
    expect(
      await new DIDResolver(dummyApi).resolve(String(did))
    ).toMatchSnapshot();
  });

  it("checks `ResolverRouter`", async () => {
    expect(() => new ResolverRouter()).toThrowError(
      "No resolvers were provided. You need to either implement `resolve` or provide a list of resolvers"
    );
    expect(() => new BMethod()).toThrowError(
      "No resolvers were provided. You need to either implement `resolve` or provide a list of resolvers"
    );
    expect(() => new APrefixBMethod()).toThrowError(
      "No resolvers were provided. You need to either implement `resolve` or provide a list of resolvers"
    );
    expect(() => new APrefix()).toThrowError(
      "No resolvers were provided. You need to either implement `resolve` or provide a list of resolvers"
    );
    expect(await new APrefixBMethodResolver().resolve("a:b:123")).toBe(
      "ab-full-a:b:123"
    );
    expect(new APrefixBMethodResolver().supports("a:b:123")).toBe(true);
    expect(new APrefixBMethodResolver().supports("a:c:123")).toBe(false);
    expect(new APrefixBMethodResolver().supports("c:b:123")).toBe(false);
    expect(new APrefixBMethodResolver().supports("a:b:123")).toBe(true);
    expect(new APrefixBMethodResolver().supports("a:c:123")).toBe(false);
    expect(new APrefixBMethodResolver().supports("c:b:123")).toBe(false);

    expect(await new APrefixBMethodResolverExtended().resolve("a:b:456")).toBe(
      "ab-extended-a:b:456"
    );
    expect(
      await new APrefixBMethod([new APrefixBMethodResolver()]).resolve(
        "a:b:456"
      )
    ).toBe("ab-full-a:b:456");
    expect(
      await new APrefixBMethod([new APrefixBMethodResolverExtended()]).resolve(
        "a:b:456"
      )
    ).toBe("ab-extended-a:b:456");

    const wildcard = new WildcardResolverRouter([
      new APrefixBMethodResolver(),
      new CPrefixDMethodResolver(),
      new APrefixWildcardMethodResolver(),
      new WildcardPrefixBMethodResolver(),
      new WildcardPrefixAndMethodResolver(),
    ]);

    expect(await wildcard.resolve("a:b:")).toBe("ab-full-a:b:");
    expect(await wildcard.resolve("a:asdasdas:")).toBe(
      "a-wildcard-a:asdasdas:"
    );
    expect(await wildcard.resolve("asdasdasd:b:")).toBe(
      "wildcard-b-asdasdasd:b:"
    );
    expect(await wildcard.resolve("c:d:")).toBe("cd-full-c:d:");
    expect(await wildcard.resolve("asdasdasd:asdasdasd:")).toBe(
      "wildcard-wildcard-asdasdasd:asdasdasd:"
    );

    const nestedWildcard = new WildcardResolverRouter([
      new APrefixBMethodResolverExtended(),
      new WildcardResolverRouter([wildcard]),
    ]);
    expect(await nestedWildcard.resolve("a:b:")).toBe("ab-extended-a:b:");
    expect(await nestedWildcard.resolve("c:d:")).toBe("cd-full-c:d:");
    expect(await wildcard.resolve("a:asdasdas:")).toBe(
      "a-wildcard-a:asdasdas:"
    );
    expect(await nestedWildcard.resolve("asdasdasd:asdasdasd:")).toBe(
      "wildcard-wildcard-asdasdasd:asdasdasd:"
    );

    const abTop = new APrefixBMethodResolverExtended();
    const ab = new APrefixBMethodResolver();
    const cd = new CPrefixDMethodResolver();
    const acdTop = new APrefixCDMethod();
    const awildcard = new APrefixWildcardMethodResolver();
    const widlcardb = new WildcardPrefixBMethodResolver();

    const discreteWrappedInWildcard = new WildcardResolverRouter([
      new WildcardResolverRouter([ab, cd, awildcard, widlcardb]),
      acdTop,
      abTop,
    ]);

    expect(discreteWrappedInWildcard.matchingResolver("a:b:")).toBe(abTop);
    expect(
      discreteWrappedInWildcard
        .matchingResolver("c:d:")
        .matchingResolver("c:d:")
    ).toBe(cd);
    expect(discreteWrappedInWildcard.matchingResolver("a:c:")).toBe(acdTop);
    expect(discreteWrappedInWildcard.matchingResolver("a:d:")).toBe(acdTop);
    expect(
      discreteWrappedInWildcard
        .matchingResolver("a:e:")
        .matchingResolver("a:e:")
    ).toBe(awildcard);
    expect(discreteWrappedInWildcard.matchingResolver("c:f:")).toBe(null);
    expect(
      discreteWrappedInWildcard
        .matchingResolver("x:b:")
        .matchingResolver("x:b:")
    ).toBe(widlcardb);
    expect(discreteWrappedInWildcard.matchingResolver("e:a:")).toBe(null);
  });

  it(`Initializes \`ResolverRouter\` with duplicate items`, () => {
    new ResolverRouter([
      new (class extends Resolver {
        prefix = ["b", "b"];
        method = ["a", "a"];
      })(),
    ]);
  });

  it("checks `createResolver`", async () => {
    const resolve = async () => 1;

    expect(() =>
      createResolver(new APrefixBMethodResolver(), { prefix: "c" })
    ).toThrowError("Item not found in [c]: `a`");

    expect(() =>
      createResolver(new APrefixBMethodResolver(), { method: "c" })
    ).toThrowError("Item not found in [c]: `b`");

    const singleResolver = createResolver(resolve, {
      prefix: "abc",
      method: "cde",
    });

    expect(await singleResolver.resolve("abc:cde:1")).toBe(1);
    expect(singleResolver.supports("abc:cde:1")).toBe(true);
    expect(singleResolver.supports("abc:de:1")).toBe(false);

    const wildcardResolver = createResolver(
      createResolver(resolve, { prefix: "abc", method: "cde" })
    );

    expect(await wildcardResolver.resolve("abc:cde:1")).toBe(1);
    expect(wildcardResolver.supports("abc:cde:1")).toBe(true);
    expect(wildcardResolver.supports("abc:de:1")).toBe(true);

    const multiResolver = createResolver(resolve, {
      prefix: ["abc"],
      method: ["cde"],
    });
    expect(await multiResolver.resolve("abc:cde:1")).toBe(1);
    expect(multiResolver.supports("abc:cde:1")).toBe(true);
    expect(multiResolver.supports("abc:de:1")).toBe(false);
  });
});
