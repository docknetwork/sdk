import * as path from "path";
import * as r1csf from "r1csfile";
import * as fs from "fs";
import { stringToHex } from "@docknetwork/credential-sdk/utils";
import stringify from "json-stringify-deterministic";
import { DockBlobId } from "@docknetwork/credential-sdk/types";

/**
 * Given messages and indices to reveal, returns 2 maps, one for revealed messages and one for unrevealed
 * @param messages
 * @param revealedIndices
 * @returns [Map<number, Uint8Array>, Map<number, Uint8Array>]
 */
export function getRevealedUnrevealed(messages, revealedIndices) {
  const revealedMsgs = new Map();
  const unrevealedMsgs = new Map();
  for (let i = 0; i < messages.length; i++) {
    if (revealedIndices.has(i)) {
      revealedMsgs.set(i, messages[i]);
    } else {
      unrevealedMsgs.set(i, messages[i]);
    }
  }

  return [revealedMsgs, unrevealedMsgs];
}

export function circomArtifactPath(fileName) {
  return `${path.resolve("./")}/tests/integration/anoncreds/circom/${fileName}`;
}

export function getWasmBytes(fileName) {
  const content = fs.readFileSync(circomArtifactPath(fileName));
  return new Uint8Array(content);
}

export async function parseR1CSFile(r1csName) {
  const parsed = await r1csf.readR1cs(circomArtifactPath(r1csName));
  await parsed.curve.terminate();
  return parsed;
}

/**
 * Takes a full JSON schema (with properties) and writes to the chain. Returns the encoded schema with reference and the schema id
 * @param fullSchema
 * @param title
 * @param did
 * @param pair
 * @param dock
 * @returns {Promise<[{id: string, type: string},{$schema: string, title, type: string, $id: string},string]>}
 */
export async function setupExternalSchema(
  fullSchema,
  title,
  did,
  pair,
  blobModule,
) {
  const blobId = DockBlobId.random();
  const qualifiedBlobId = String(blobId);
  const schemaExternal = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: qualifiedBlobId,
    title,
    type: "object",
  };

  const blobStr = JSON.stringify(fullSchema);
  const blob = {
    id: blobId,
    blob: stringToHex(blobStr),
  };
  await blobModule.new(blob, did, pair);

  return [
    {
      id: qualifiedBlobId,
      type: "JsonSchemaValidator2018",
      details: stringify({
        jsonSchema: schemaExternal,
      }),
    },
    qualifiedBlobId,
  ];
}

export function getResidentCardCredentialAndSchema(context) {
  const id = "https://ld.dock.io/examples/resident-card-schema.json";
  const residentCardSchema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: id,
    title: "Resident Card Example",
    type: "object",
    properties: {
      credentialSubject: {
        type: "object",
        properties: {
          givenName: {
            title: "Given Name",
            type: "string",
          },
          familyName: {
            title: "Family Name",
            type: "string",
          },
          lprNumber: {
            title: "LPR Number",
            type: "integer",
            minimum: 0,
          },
        },
        required: [],
      },
    },
  };

  const encodedSchema = {
    id,
    type: "JsonSchemaValidator2018",
    details: stringify({ jsonSchema: residentCardSchema }),
  };

  const credentialJSON = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/citizenship/v1",
      context,
    ],
    id: "https://issuer.oidp.uscis.gov/credentials/83627465",
    type: ["VerifiableCredential", "PermanentResidentCard"],
    credentialSchema: encodedSchema,
    identifier: "83627465",
    name: "Permanent Resident Card",
    description: "Government of Example Permanent Resident Card.",
    issuanceDate: "2019-12-03T12:19:52Z",
    expirationDate: "2029-12-03T12:19:52Z",
    credentialSubject: {
      id: "did:example:b34ca6cd37bbf23",
      type: ["PermanentResident", "Person"],
      givenName: "JOHN",
      familyName: "SMITH",
      lprNumber: 1234,
    },
  };

  return [credentialJSON, residentCardSchema];
}
