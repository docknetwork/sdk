# Schemas

## Table of Contents
1. [Intro](#intro-to-schemas)
1. [Blobs](#blobs)
1. [JSON Schemas](#json-schemas)
1. [Schemas in Verifiable Credentials](#schemas-in-verifiable-credentials)

## Intro to Schemas
Data Schemas are useful when enforcing a specific structure on a collection of data like a Verifiable Credential.
Data Verification schemas, for example, are used to verify that the structure and contents of a Verifiable Credential
conform to a published schema. Data Encoding schemas, on the other hand, are used to map the contents of a Verifiable
Credential to an alternative representation format, such as a binary format used in a zero-knowledge proof.
Data schemas serve a different purpose than that of the `@context` property in a Verifiable Credential, the latter
neither enforces data structure or data syntax, nor enables the definition of arbitrary encodings to alternate
representation formats.

## Blobs
Before diving further into Schemas in it is important to understand the way these are stored in the Dock chain.
Schemas are stored on chain as a `Blob` in the Blob Storage module. They are identified and retrieved by their unique
blob id, a 32 byte long hex string. They are authored by a DID and have a max size of 8192 bytes.
The chain is agnostic to the contents of blobs and thus to schemas. Blobs may be used to store types of data other than
schemas.

## JSON Schemas
JSON Schema can be used to require that a given JSON document (an instance) satisfies a certain number of criteria.
JSON Schema validation asserts constraints on the structure of instance data. An instance location that satisfies all
asserted constraints is then annotated with any keywords that contain non-assertion information, such as descriptive
metadata and usage hints. If all locations within the instance satisfy all asserted constraints, then the instance is
said to be valid against the schema.
Each schema object is independently evaluated against each instance location to which it applies.
This greatly simplifies the implementation requirements for validators by ensuring that they do not need to maintain
state across the document-wide validation process.
More about JSON schemas can be found [here](http://json-schema.org/draft/2019-09/json-schema-validation.html) and
[here](https://json-schema.org/understanding-json-schema/index.html).

Let's see an example JSON schema definition:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "description": "Alumni",
  "type": "object",
  "properties": {
    "emailAddress": {
      "type": "string",
      "format": "email"
    },
    "alumniOf": {
      "type": "string"
    }
  },
  "required": ["emailAddress", "alumniOf"],
  "additionalProperties": false
}
```

In our context, these schemas are stored on-chain as a blob, which means they have a Blob Id as id and a DID as author:
```json
{
   "id": "blob:dock:1DFdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
   "author": "did:dock:5CEdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
   "schema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "description": "Alumni",
      "type": "object",
      "properties": {
        "emailAddress": {
          "type": "string",
          "format": "email"
        },
        "alumniOf": {
          "type": "string"
        }
      },
      "required": ["emailAddress", "alumniOf"],
      "additionalProperties": false
    }
}
```
Had we referenced this JSON schema from within a Verifiable Credential, validation would fail if the `credentialSubject`
doesn't contain an `emailAddress` field, or it isn't a string formatted as an email; or if it doesn't contain a
property `alumniOf` with type string. It'd also fail if a subject contains other properties not listed here (except for
the `id` property which is popped out before validation).


## Schemas in Verifiable Credentials
In pursuit of [extensibility](https://w3c.github.io/vc-data-model/#extensibility), VCDM makes an Open World Assumption;
a credential can state anything. Schemas allow issuers to "opt-out" of some of the freedom VCDM allows. Issuers can
concretely limit what a given credential will claim. In a closed world, a verifier can rely on the structure of a
credential to enable new types of credential processing e.g. generating a complete and human-friendly graphical
representation of a credential.

The [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/) specifies the models used for Verifiable
Credentials and Verifiable Presentations, and explains the relationships between three parties: issuer, holder, and
verifier. A critical piece of infrastructure out of the scope of those specifications is the Credential Schema.
[This specification](https://w3c-ccg.github.io/vc-json-schemas/) provides a mechanism to express a Credential Schema
and the protocols for evolving the schema.

Following our example above, we could use the current SDK to store the Email schema above as a Blob in the Dock chain.
Assuming we did that and our schema was stored as `blob:dock:1DFdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW`, we
can use it in a Verifiable Credential as follows:
```json
"credentialSchema": {
  "id": "blob:dock:1DFdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
  "type": "JsonSchemaValidator2018"
}
```
The following is an example of a valid Verifiable Credential using the above schema:
```json
{
   "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
   ],
   "id": "uuid:0x9b561796d3450eb2673fed26dd9c07192390177ad93e0835bc7a5fbb705d52bc",
   "type": [
      "VerifiableCredential",
      "AlumniCredential"
   ],
   "issuanceDate": "2020-03-18T19:23:24Z",
   "credentialSchema": {
      "id": "blob:dock:1DFdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
      "type": "JsonSchemaValidator2018"
   },
   "credentialSubject": {
      "id": "did:dock:5GL3xbkr3vfs4qJ94YUHwpVVsPSSAyvJcafHz1wNb5zrSPGi",
      "emailAddress": "john.smith@example.com",
      "alumniOf": "Example University"
   },
   "issuer": "did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr",
   "proof": {
      "type": "Ed25519Signature2018",
      "created": "2020-04-22T07:50:13Z",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GBqyaiTMhVt4R5P2bMGcLNJPWEUq7WmGHG7Wc6mKBo9k3vSo7v7sRKwqS8-m0og_ANKcb5m-_YdXC2KMnZwLBg",
      "proofPurpose": "assertionMethod",
      "verificationMethod": "did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr#keys-1"
   }
}
```
In contrast, the following is an example of an invalid Verifiable Credential:
```json
{
   "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
   ],
   "id": "uuid:0x9b561796d3450eb2673fed26dd9c07192390177ad93e0835bc7a5fbb705d52bc",
   "type": [
      "VerifiableCredential",
      "AlumniCredential"
   ],
   "issuanceDate": "2020-03-18T19:23:24Z",
   "credentialSchema": {
      "id": "blob:dock:1DFdyZkZnALDdCAp7crTRiaCq6KViprTM6kHUQCD8X6VqGPW",
      "type": "JsonSchemaValidator2018"
   },
   "credentialSubject": [
      {
        "id": "did:dock:5GL3xbkr3vfs4qJ94YUHwpVVsPSSAyvJcafHz1wNb5zrSPGi",
        "emailAddress": "john.smith@example.com",
        "alumniOf": "Example University"
      },
      {
        "id": "did:dock:6DF3xbkr3vfs4qJ94YUHwpVVsPSSAyvJcafHz1wNb5zrSPGi",
      }

   ],
   "issuer": "did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr",
   "proof": {
      "type": "Ed25519Signature2018",
      "created": "2020-04-22T07:50:13Z",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..GBqyaiTMhVt4R5P2bMGcLNJPWEUq7WmGHG7Wc6mKBo9k3vSo7v7sRKwqS8-m0og_ANKcb5m-_YdXC2KMnZwLBg",
      "proofPurpose": "assertionMethod",
      "verificationMethod": "did:dock:5GUBvwnV6UyRWZ7wjsBptSquiSHGr9dXAy8dZYUR9WdjmLUr#keys-1"
   }
}
```
the reason this last Credential is invalid is that only one of the subjects properly follow the Schema, the second
subject does not specify the fields `emailAddress` and `alumniOf` which were specified as required.
