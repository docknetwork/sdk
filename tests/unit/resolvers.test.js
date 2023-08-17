import { Resolver, MultiResolver, WILDCARD } from "../../src/resolver";
import { createResolver } from "../../src/resolver";

class APrefixBMethodFull extends MultiResolver {
  static PREFIX = "a";
  static METHOD = "b";

  async resolve(id) {
    return this.supports(id) ? `ab-full-${id}` : null;
  }
}

class CPrefixDMethodFull extends MultiResolver {
  static PREFIX = "c";
  static METHOD = "d";

  async resolve(id) {
    return this.supports(id) ? `cd-full-${id}` : null;
  }
}

class BMethod extends MultiResolver {
  static METHOD = "b";
}

class APrefix extends MultiResolver {
  static PREFIX = "a";
}

class APrefixBMethod extends APrefix {
  static METHOD = "b";
}

class APrefixBMethodFullExtended extends APrefixBMethod {
  async resolve(id) {
    return this.supports(id) ? `ab-extended-${id}` : null;
  }
}

class APrefixCDMethod extends MultiResolver {
  static PREFIX = "a";
  static METHOD = ["b", "c"];
}

class APrefixWildcardMethodFull extends MultiResolver {
  static PREFIX = "a";
  static METHOD = WILDCARD;

  async resolve(id) {
    return this.supports(id) ? `a-wildcard-${id}` : null;
  }
}

class WildcardPrefixBMethodFull extends MultiResolver {
  static PREFIX = WILDCARD;
  static METHOD = "b";

  async resolve(id) {
    return this.supports(id) ? `wildcard-b-${id}` : null;
  }
}

class WildcardPrefixAndMethod extends MultiResolver {
  static PREFIX = WILDCARD;
  static METHOD = WILDCARD;
}

class WildcardPrefixAndMethodFull extends WildcardPrefixAndMethod {
  async resolve(id) {
    return this.supports(id) ? `wildcard-wildcard-${id}` : null;
  }
}

describe("Resolvers", () => {
  it("checks `MultiResolver`", async () => {
    expect(() => new MultiResolver()).toThrowError(
      "Static property `PREFIX` of `MultiResolver` isn't extended properly"
    );
    expect(() => new BMethod()).toThrowError(
      "Static property `PREFIX` of `BMethod` isn't extended properly"
    );
    expect(() => new APrefixBMethod()).toThrowError("No resolvers provided");
    expect(() => new APrefix()).toThrowError(
      "Static property `METHOD` of `APrefix` isn't extended properly"
    );
    expect(() => new MultiResolver([new APrefixBMethodFull()])).toThrowError(
      "Static property `PREFIX` of `MultiResolver` isn't extended properly"
    );
    expect(
      () =>
        new APrefixBMethod([new APrefixBMethodFull(), new APrefixBMethodFull()])
    ).toThrowError(
      "Two resolvers for the same prefix and method - `a:b`: `APrefixBMethodFull` and `APrefixBMethodFull`"
    );
    expect(await new APrefixBMethodFull().resolve("a:b:123")).toBe(
      "ab-full-a:b:123"
    );
    expect(new APrefixBMethodFull().supports("a:b:123")).toBe(true);
    expect(new APrefixBMethodFull().supports("a:c:123")).toBe(false);
    expect(new APrefixBMethodFull().supports("c:b:123")).toBe(false);
    expect(new APrefixBMethodFull().supports("a:b:123")).toBe(true);
    expect(new APrefixBMethodFull().supports("a:c:123")).toBe(false);
    expect(new APrefixBMethodFull().supports("c:b:123")).toBe(false);

    expect(await new APrefixBMethodFullExtended().resolve("a:b:456")).toBe(
      "ab-extended-a:b:456"
    );
    expect(
      await new APrefixBMethod([new APrefixBMethodFull()]).resolve("a:b:456")
    ).toBe("ab-full-a:b:456");
    expect(
      await new APrefixBMethod([new APrefixBMethodFullExtended()]).resolve(
        "a:b:456"
      )
    ).toBe("ab-extended-a:b:456");

    const wildcard = new WildcardPrefixAndMethod([
      new APrefixBMethodFull(),
      new CPrefixDMethodFull(),
      new APrefixWildcardMethodFull(),
      new WildcardPrefixBMethodFull(),
      new WildcardPrefixAndMethodFull(),
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

    const nestedWildcard = new WildcardPrefixAndMethod([
      new APrefixBMethodFullExtended(),
      new WildcardPrefixAndMethod([wildcard]),
    ]);
    expect(await nestedWildcard.resolve("a:b:")).toBe("ab-extended-a:b:");
    expect(await nestedWildcard.resolve("c:d:")).toBe("cd-full-c:d:");
    expect(await wildcard.resolve("a:asdasdas:")).toBe(
      "a-wildcard-a:asdasdas:"
    );
    expect(await nestedWildcard.resolve("asdasdasd:asdasdasd:")).toBe(
      "wildcard-wildcard-asdasdasd:asdasdasd:"
    );
  });

  it("checks `MultiResolver.constructor` legacy", async () => {
    const resolve = async () => 1;
    const resolver = new APrefixCDMethod({ b: resolve, c: resolve });

    expect(await resolver.resolve("a:b:1")).toBe(1);
    expect(await resolver.resolve("a:c:1")).toBe(1);
    expect(resolver.resolve("a:d:1")).rejects.toThrowError(
      "No resolver found for `a:d:1`"
    );
    expect(await resolver.supports("a:b:1")).toBe(true);
    expect(await resolver.supports("a:c:1")).toBe(true);
    expect(await resolver.supports("a:d:1")).toBe(false);
  });

  it("checks `createResolver`", async () => {
    const resolve = async () => 1;
    expect(createResolver(resolve, { prefix: "abc", method: "cde" })).toEqual(
      new (class extends Resolver {
        static PREFIX = "abc";
        static METHOD = "cde";

        constructor() {
          super();

          this.resolve = resolve;
        }
      })()
    );

    expect(
      await createResolver(resolve, { prefix: "abc", method: "cde" }).resolve(
        "abc:cde:1"
      )
    ).toBe(1);

    expect(
      await createResolver(
        createResolver(resolve, { prefix: "abc", method: "cde" })
      ).resolve("abc:cde:1")
    ).toBe(1);
  });
});
