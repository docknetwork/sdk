import { Ed25519Keypair } from "../src/keypairs";
import { AbstractDIDModule } from "../src/modules";
import AbstractApiProvider from "../src/modules/abstract/common/abstract-api-provider";
import AbstractStatusListCredentialModule from "../src/modules/abstract/status-list-credential/module";
import { createCredential, createList } from "@digitalcredentials/vc-status-list";
import {
  Resolver,
  ResolverRouter,
  DIDResolverWithDIDReplacement,
  WILDCARD,
  WildcardResolverRouter,
  createResolver,
  DIDResolver,
  DIDKeyResolver,
  StatusList2021Resolver,
} from "../src/resolver";
import {
  CheqdTestnetDIDDocument,
  DockDid,
  DIDDocument,
  DidKey,
} from "../src/types";
import { decodeFromBase58, encodeAsBase58, encodeAsBase58btc } from "../src/utils";
import {
  DidMethodKeyBytePrefixBBS23,
  DidMethodKeyBytePrefixBBSPlus,
} from "../src/types/did/onchain/constants";
import {
  Bls12381BBS23DockVerKeyName,
  Bls12381BBSDockVerKeyName,
} from "../src/vc/crypto";

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
        async init() {}
        async disconnect() {}
        methods() {
          return ["dock"];
        }
        isInitialized() {
          return true;
        }
        supportsIdentifier() {
          return true;
        }
        async stateChangeBytes() {}
        async signAndSend() {}
      })()
    );

    expect(
      await new DIDResolverWithDIDReplacement(dummyApi).resolve(String(did))
    ).toMatchSnapshot();
    expect(
      await new DIDResolver(dummyApi).resolve(String(did))
    ).toMatchSnapshot();
  });

  it("checks `StatusList2021Resolver` supports `http(s)` and dock identifiers", async () => {
    const statusListModule = new (class Module extends AbstractStatusListCredentialModule {
      methods() {
        return ["dock"];
      }

      async getStatusListCredential(id) {
        return {
          toJSON: () => ({ id, source: "module" }),
        };
      }
    })();
    const resolver = new StatusList2021Resolver(statusListModule);
    const statusListId = "status-list2021:dock:0x123";
    const httpsStatusListId = "https://example.com/status-list/1";
    const httpStatusListId = "http://example.com/status-list/1";
    const statusList = await createList({ length: 16 });
    const httpStatusListCredential = await createCredential({
      id: httpsStatusListId,
      list: statusList,
      statusPurpose: "revocation",
    });
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => httpStatusListCredential,
    });

    expect(resolver.supports(statusListId)).toBe(true);
    expect(resolver.supports(httpsStatusListId)).toBe(true);
    expect(resolver.supports(httpStatusListId)).toBe(true);
    expect(await resolver.resolve(statusListId)).toEqual({
      id: statusListId,
      source: "module",
    });
    expect(await resolver.resolve(httpsStatusListId)).toMatchObject({
      id: httpsStatusListId,
      credentialSubject: {
        type: "StatusList2021",
        statusPurpose: "revocation",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(httpsStatusListId, undefined);

    fetchMock.mockRestore();
  });

  it("checks `StatusList2021Resolver` skips non-status-list JSON over `http(s)`", async () => {
    const statusListModule = new (class Module extends AbstractStatusListCredentialModule {
      methods() {
        return ["dock"];
      }

      async getStatusListCredential(id) {
        return {
          toJSON: () => ({ id, source: "module" }),
        };
      }
    })();
    const resolver = new StatusList2021Resolver(statusListModule);
    const httpsStatusListId = "https://example.com/not-a-status-list";
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        id: httpsStatusListId,
        type: ["VerifiableCredential"],
      }),
    });

    expect(await resolver.resolve(httpsStatusListId)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(httpsStatusListId, undefined);

    fetchMock.mockRestore();
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

  it("checks `DIDKeyResolver` custom fallback for BBS/BBS+", async () => {
    const resolver = new DIDKeyResolver();
    const standardDid = "did:key:z6MktvqCyLxTsXUH1tUZncNdVeEZ7hNh7npPRbUU27GTrYb8";
    const standardDocument = await resolver.resolve(standardDid);
    expect(standardDocument.id).toBe(standardDid);
    expect(Array.isArray(standardDocument.verificationMethod)).toBe(true);
    expect(standardDocument.verificationMethod.length).toBeGreaterThan(0);

    const bbsBytes = Uint8Array.from({ length: 96 }, (_, idx) => idx);
    const customBbsDid = `did:key:${encodeAsBase58btc(
      DidMethodKeyBytePrefixBBS23,
      bbsBytes
    )}`;
    const bbsDocument = await resolver.resolve(customBbsDid);
    const bbsMethodId = `${customBbsDid}#${customBbsDid.split(":")[2]}`;
    expect(bbsDocument).toEqual({
      "@context": "https://www.w3.org/ns/did/v1",
      id: customBbsDid,
      verificationMethod: [
        {
          id: bbsMethodId,
          type: Bls12381BBS23DockVerKeyName,
          controller: customBbsDid,
          publicKeyBase58: encodeAsBase58(bbsBytes),
        },
      ],
      authentication: [bbsMethodId],
      assertionMethod: [bbsMethodId],
      capabilityInvocation: [bbsMethodId],
      capabilityDelegation: [bbsMethodId],
    });

    const bbsPlusBytes = Uint8Array.from({ length: 96 }, (_, idx) => 255 - idx);
    const customBbsPlusDid = `did:key:${encodeAsBase58btc(
      DidMethodKeyBytePrefixBBSPlus,
      bbsPlusBytes
    )}`;
    const bbsPlusDocument = await resolver.resolve(customBbsPlusDid);
    expect(bbsPlusDocument.verificationMethod[0].type).toBe(
      Bls12381BBSDockVerKeyName
    );
  });

  it("checks `DIDKeyResolver` fallback with DID URL fragment", async () => {
    const resolver = new DIDKeyResolver();
    const bbsBytes = Uint8Array.from({ length: 96 }, (_, idx) => idx);
    const customBbsDid = `did:key:${encodeAsBase58btc(
      DidMethodKeyBytePrefixBBS23,
      bbsBytes
    )}`;
    const didUrl = `${customBbsDid}#custom-fragment`;
    const didDoc = await resolver.resolve(didUrl);

    expect(didDoc.id).toBe(customBbsDid);
    expect(didDoc.verificationMethod[0].controller).toBe(customBbsDid);
    expect(didDoc.verificationMethod[0].id).toBe(
      `${customBbsDid}#${customBbsDid.split(":")[2]}`
    );
  });

  it("checks `DIDKeyResolver` does not fallback for unknown custom headers", async () => {
    const resolver = new DIDKeyResolver();
    const unknownHeaderDid = `did:key:${encodeAsBase58btc(
      new Uint8Array([0xf7, 0x01]),
      Uint8Array.from({ length: 96 }, (_, idx) => idx)
    )}`;

    await expect(resolver.resolve(unknownHeaderDid)).rejects.toThrow();
  });
});
