// Mock fetch

import VerifiableCredential from "../src/vc/verifiable-credential";
import { Schema } from "../src/modules/abstract/schema";
import { DockBlobId } from "../src/types/blob";

import { expandJSONLD } from "../src/vc/helpers";

import { validateCredentialSchema } from "../src/vc/schema";

import { expandedSubjectProperty } from "../src/vc/constants";

import exampleCredential from "./utils/example-credential";
import exampleSchema from "./utils/example-schema";

describe("VerifiableCredential Tests", () => {
  const vc = new VerifiableCredential(exampleCredential.id);
  vc.addSubject(exampleCredential.credentialSubject);
  vc.setContext(exampleCredential["@context"]);

  test("VerifiableCredential's setSchema should appropriately set credentialSchema.", () => {
    vc.setSchema(
      exampleCredential.credentialSchema.id,
      exampleCredential.credentialSchema.type
    );
    expect(vc.credentialSchema).toMatchObject(
      expect.objectContaining({
        id: expect.anything(),
        type: expect.anything(),
      })
    );
  });

  test("VerifiableCredential's validateSchema should validate the credentialSubject with given JSON schema.", async () => {
    const result = await vc.validateSchema(exampleSchema);
    expect(result).toBe(true);
  }, 20000);
});

describe("Basic Schema Tests", () => {
  let schema;

  beforeAll(async () => {
    schema = new Schema(DockBlobId.random());
  }, 10000);

  test("setJSONSchema will only accept valid JSON schema and set the schema key of the object.", async () => {
    await expect(
      schema.setJSONSchema({
        invalidSchema: true,
      })
    ).rejects.toThrow();

    await schema.setJSONSchema(exampleSchema);
    expect(schema.schema).toBe(exampleSchema);
  });

  test("validateSchema will check that the given schema is a valid JSON-schema.", async () => {
    await expect(Schema.validateSchema(exampleSchema)).resolves.toBeDefined();
  });

  test("toJSON will generate a JSON that can be sent to chain.", () => {
    const result = schema.toJSON();
    expect(result).toMatchObject(
      expect.objectContaining({
        id: expect.anything(),
        schema: expect.anything(),
      })
    );
  });

  test("toBlob will generate a JSON that can be sent to written with blob module", () => {
    const result = schema.toBlob();
    expect(result).toMatchObject(
      expect.objectContaining({
        id: expect.anything(),
        blob: expect.anything(),
      })
    );
  });
});

describe("Validate Credential Schema utility", () => {
  const schema = new Schema(DockBlobId.random());
  schema.setJSONSchema(exampleSchema);

  let expandedCredential;
  beforeAll(async () => {
    expandedCredential = await expandJSONLD(exampleCredential);
  }, 10000);

  test("credentialSubject has same fields and fields have same types as JSON-schema", () => {
    expect(
      validateCredentialSchema(
        expandedCredential,
        schema,
        exampleCredential["@context"]
      )
    ).toBeDefined();
  });

  test("credentialSubject has same fields but fields have different type than JSON-schema", async () => {
    await expect(
      validateCredentialSchema(
        {
          [`${expandedSubjectProperty}`]: {
            invalid: true,
          },
        },
        schema,
        exampleCredential["@context"]
      )
    ).rejects.toThrow();
  }, 100000);

  test("credentialSubject is missing required fields from the JSON-schema and it should fail to validate.", async () => {
    const credentialSubject = {
      ...expandedCredential[expandedSubjectProperty],
    };
    delete credentialSubject["https://schema.org/alumniOf"];
    await expect(
      validateCredentialSchema(
        {
          [`${expandedSubjectProperty}`]: credentialSubject,
        },
        schema,
        exampleCredential["@context"]
      )
    ).rejects.toThrow();
  }, 100000);

  test("The schema's properties is missing the required key and credentialSubject can omit some of the properties.", async () => {
    const nonRequiredSchema = { ...exampleSchema };
    delete nonRequiredSchema.required;
    await schema.setJSONSchema(nonRequiredSchema);

    const credentialSubject = {
      ...expandedCredential[expandedSubjectProperty][0],
    };
    delete credentialSubject["https://schema.org/alumniOf"];

    await expect(
      validateCredentialSchema(
        {
          [`${expandedSubjectProperty}`]: credentialSubject,
        },
        schema,
        exampleCredential["@context"]
      )
    ).resolves.toBeDefined();
  });

  test("credentialSubject has extra fields than given schema specifies and additionalProperties has certain type.", async () => {
    const credentialSubject = {
      ...expandedCredential[expandedSubjectProperty][0],
      additionalString: "mystring",
    };
    await schema.setJSONSchema({
      ...exampleSchema,
      additionalProperties: { type: "string" },
    });

    await expect(
      validateCredentialSchema(
        {
          [`${expandedSubjectProperty}`]: credentialSubject,
        },
        schema,
        exampleCredential["@context"]
      )
    ).resolves.toBeDefined();
  });

  test("credentialSubject has nested fields and given schema specifies the nested structure.", async () => {
    const credentialSubject = {
      ...expandedCredential[expandedSubjectProperty][0],
      nestedFields: {
        test: true,
      },
    };

    await schema.setJSONSchema({
      ...exampleSchema,
      properties: {
        ...exampleSchema.properties,
        nestedFields: {
          properties: {
            test: {
              type: "boolean",
            },
          },
        },
      },
    });

    await expect(
      validateCredentialSchema(
        {
          [`${expandedSubjectProperty}`]: credentialSubject,
        },
        schema,
        exampleCredential["@context"]
      )
    ).resolves.toBeDefined();
  });
});
