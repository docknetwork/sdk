import { Resolver, MultiResolver, WILDCARD } from "../../src/resolver";
import { createResolver } from "../../src/resolver/utils";

class ABFullResolver extends MultiResolver {
  static PREFIX = "a";
  static METHOD = "b";

  async resolve(id) {
    return this.supports(id) ? `ab-full-${id}` : null;
  }
}

class CDFullResolver extends MultiResolver {
  static PREFIX = "c";
  static METHOD = "d";

  async resolve(id) {
    return this.supports(id) ? `cd-full-${id}` : null;
  }
}

class BMethodResolver extends MultiResolver {
  static METHOD = "b";
}

class APrefixResolver extends MultiResolver {
  static PREFIX = "a";
}

class APrefixResolverWithBMethod extends APrefixResolver {
  static METHOD = "b";
}

class APrefixResolverWithBMethodFull extends APrefixResolverWithBMethod {
  async resolve(id) {
    return this.supports(id) ? `ab-extended-${id}` : null;
  }
}

class ABMultiResolver extends MultiResolver {
  static PREFIX = "a";
  static METHOD = "b";
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
    expect(() => new BMethodResolver()).toThrowError(
      "Static property `PREFIX` of `BMethodResolver` isn't extended properly"
    );
    expect(() => new APrefixResolverWithBMethod()).toThrowError(
      "No resolvers provided"
    );
    expect(() => new APrefixResolver()).toThrowError(
      "Static property `METHOD` of `APrefixResolver` isn't extended properly"
    );
    expect(() => new MultiResolver([new ABFullResolver()])).toThrowError(
      "Static property `PREFIX` of `MultiResolver` isn't extended properly"
    );
    expect(
      () =>
        new ABMultiResolver([
          new ABFullResolver(),
          new APrefixResolverWithBMethodFull(),
        ])
    ).toThrowError(
      "Two resolvers for the same prefix and method - `a:b`: `ABFullResolver` and `APrefixResolverWithBMethodFull`"
    );
    expect(await new ABFullResolver().resolve("a:b:123")).toBe(
      "ab-full-a:b:123"
    );
    expect(new ABFullResolver().supports("a:b:123")).toBe(true);
    expect(new ABFullResolver().supports("a:c:123")).toBe(false);
    expect(new ABFullResolver().supports("c:b:123")).toBe(false);
    expect(new APrefixResolverWithBMethodFull().supports("a:b:123")).toBe(true);
    expect(new APrefixResolverWithBMethodFull().supports("a:c:123")).toBe(
      false
    );
    expect(new APrefixResolverWithBMethodFull().supports("c:b:123")).toBe(
      false
    );

    expect(await new APrefixResolverWithBMethodFull().resolve("a:b:456")).toBe(
      "ab-extended-a:b:456"
    );
    expect(
      await new ABMultiResolver([new ABFullResolver()]).resolve("a:b:456")
    ).toBe("ab-full-a:b:456");
    expect(
      await new ABMultiResolver([new APrefixResolverWithBMethodFull()]).resolve(
        "a:b:456"
      )
    ).toBe("ab-extended-a:b:456");

    const wildcard = new WildcardPrefixAndMethod([
      new ABFullResolver(),
      new CDFullResolver(),
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
      new APrefixResolverWithBMethodFull(),
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
  });
});
