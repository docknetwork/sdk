import {
  Resolver,
  ResolverRouter,
  WILDCARD,
  WildcardResolverRouter,
  createResolver,
} from "../src/resolver";

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
