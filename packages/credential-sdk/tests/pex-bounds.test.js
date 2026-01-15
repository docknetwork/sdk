import {
  applyEnforceBounds,
  blobFromBase64,
  isBase64OrDataUrl,
  pexToBounds,
} from "../src/pex/pex-bounds";

describe("pex-bounds utilities", () => {
  const sampleCredential = {
    credentialSubject: {
      age: 30,
      score: 98.6,
      nested: {
        metric: 42,
      },
    },
  };

  const sampleDefinition = {
    input_descriptors: [
      {
        id: "age",
        constraints: {
          fields: [
            {
              path: ["$.credentialSubject.age"],
              filter: {
                type: "integer",
                minimum: 18,
                maximum: 65,
              },
            },
          ],
        },
      },
      {
        id: "score",
        constraints: {
          fields: [
            {
              path: ["$.credentialSubject.score"],
              filter: {
                type: "number",
                minimum: 80.5,
                maximum: 100.25,
              },
            },
          ],
        },
      },
    ],
  };

  test("pexToBounds converts descriptors to enforceable bounds", () => {
    const bounds = pexToBounds(sampleDefinition, [sampleCredential, sampleCredential]);
    expect(bounds).toHaveLength(2);
    expect(bounds[0][0]).toMatchObject({
      attributeName: "credentialSubject.age",
      min: 18,
      max: 65,
    });
    expect(bounds[1][0]).toMatchObject({
      attributeName: "credentialSubject.score",
      min: expect.closeTo(80.5, 5),
      max: expect.closeTo(100.25, 5),
    });
  });

  test("applyEnforceBounds invokes builder for every descriptor", () => {
    const calls = [];
    const builder = {
      enforceBounds: (...args) => {
        calls.push(args);
      },
    };

    const results = applyEnforceBounds({
      builder,
      presentationDefinition: sampleDefinition,
      provingKeyId: "key-id",
      provingKey: "dummy-key",
      selectedCredentials: [sampleCredential, sampleCredential],
    });

    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe(0);
    expect(calls[1][0]).toBe(1);
    expect(results[0][0].attributeName).toBe("credentialSubject.age");
    expect(results[1][0].attributeName).toBe("credentialSubject.score");
  });

  test("applyEnforceBounds with credentialIdx targets provided builder index", () => {
    const calls = [];
    const builder = {
      enforceBounds: (...args) => {
        calls.push(args);
      },
    };

    const targetedResults = applyEnforceBounds({
      builder,
      presentationDefinition: sampleDefinition,
      provingKeyId: "key-id",
      provingKey: "dummy-key",
      selectedCredentials: [sampleCredential],
      credentialIdx: 5,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(5);
    expect(targetedResults[5][0].attributeName).toBe("credentialSubject.age");
  });

  test("blobFromBase64 decodes payloads and detector recognizes supported formats", () => {
    const payload = "data:application/octet-stream;base64," + Buffer.from("hello world").toString("base64");
    const decoded = blobFromBase64(payload);
    expect(Buffer.from(decoded).toString()).toBe("hello world");
    expect(isBase64OrDataUrl(payload)).toBe(true);
    expect(isBase64OrDataUrl(Buffer.from("test").toString("base64"))).toBe(true);
    expect(isBase64OrDataUrl("not-base64")).toBe(false);
  });
});

