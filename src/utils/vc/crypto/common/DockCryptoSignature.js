import { initializeWasm, CredentialSchema, DefaultSchemaParsingOpts } from '@docknetwork/crypto-wasm-ts';
import * as _ from 'underscore';

import jsonld from 'jsonld';
import { SECURITY_CONTEXT_URL } from 'jsonld-signatures';

import { u8aToU8a } from '@polkadot/util';
import stringify from 'json-stringify-deterministic';
import { withExtendedStaticProperties } from '../../../inheritance';
import CustomLinkedDataSignature from './CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export const DEFAULT_PARSING_OPTS = {
  useDefaults: false,
};

/**
 * Defines commons for the `@docknetwork/crypto-wasm-ts` signatures.
 */
export default withExtendedStaticProperties(
  ['KeyPair', 'CredentialBuilder', 'Credential', 'proofType'],
  class DockCryptoSignature extends CustomLinkedDataSignature {
    /**
     * Default constructor
     * @param options {SignatureSuiteOptions} options for constructing the signature suite
     * @param type
     * @param LDKeyClass
     * @param url
     */
    constructor(options = {}, type, LDKeyClass, url) {
      const {
        verificationMethod, signer, keypair, verifier,
      } = options;

      super({
        type,
        LDKeyClass,
        contextUrl: SUITE_CONTEXT_URL,
        alg: type,
        signer,
        verifier,
        useProofValue: true,
      });

      this.proof = {
        '@context': [
          {
            sec: 'https://w3id.org/security#',
            proof: {
              '@id': 'sec:proof',
              '@type': '@id',
              '@container': '@graph',
            },
          },
          url,
        ],
        type,
      };

      this.requireCredentialSchema = true;
      this.verificationMethod = verificationMethod;
      if (keypair) {
        if (verificationMethod === undefined) {
          this.verificationMethod = keypair.id;
        }
        this.key = keypair;
      }
    }

    /** Create serialized credential for signing and verification
     * @param {object} options - The options to use.
     * @param {object} options.document - The document to be signed/verified.
     * @param {object} options.proof - The proof to be verified.
     * @param {function} options.documentLoader - The document loader to use.
     * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
     *
     * @returns {Promise<Uint8Array[]>}.
     */
    async createVerifyData(options) {
      await initializeWasm();

      // If this function is being called for credential verification or not
      const forVerification = options.proof && options.proof.proofValue;

      let serializedCredential;
      let credSchema;
      if (forVerification) {
        if (options.document.cryptoVersion) {
          // Newer credentials will have cryptoVersion field set
          [serializedCredential, credSchema] = this.constructor.convertCredentialForVerification(options);
        } else {
          // Legacy. Cannot use `convertCredentialForVerification` because JSON.stringify is not deterministic
          // and credentialSchema string becomes different. See https://stackoverflow.com/a/43049877
          [serializedCredential, credSchema] = this.constructor.convertCredential(options);
        }
      } else {
        // Serialize the data for signing
        [serializedCredential, credSchema] = await this.constructor.convertCredentialToSerializedForSigning(options);
      }

      // Encode messages, retrieve names/values array
      const nameValues = credSchema.encoder.encodeMessageObject(
        serializedCredential,
        false,
      );
      return nameValues[1];
    }

    /**
     * Convert given JSON-LD credential to TS-anoncred's credential. This would not have the signature.
     * @param document - JSON-LD credential
     * @param explicitProof
     * @param signingOptions
     * @returns {Array} - Returns [serialized cred object, cred schema]
     */
    static convertCredential({
      document,
      proof: explicitProof /* documentLoader */,
      signingOptions = { requireAllFieldsFromSchema: false },
    }) {
      const [trimmedProof] = this.getTrimmedProofAndValue(document, explicitProof);

      const [credSchema] = this.extractSchema(document);

      const credBuilder = new this.CredentialBuilder();
      // Set legacy version
      credBuilder.version = '0.2.0';
      credBuilder.schema = credSchema;

      // Extract top level fields from the document aside from these
      const {
        cryptoVersion: _cryptoVersion,
        credentialSchema: _credentialSchema,
        credentialSubject,
        credentialStatus,
        ...topLevelFields
      } = {
        ...document,
        proof: trimmedProof,
      };
      credBuilder.subject = credentialSubject;
      credBuilder.credStatus = credentialStatus;

      // Add all other top level fields to the credential
      Object.keys(topLevelFields)
        .sort()
        .forEach((k) => {
          credBuilder.setTopLevelField(k, topLevelFields[k]);
        });

      // To work with JSON-LD credentials/presentations, we must always reveal the context and type
      // NOTE: that they are encoded as JSON strings here to reduce message count and so its *always known*
      credBuilder.setTopLevelField(
        '@context',
        JSON.stringify(document['@context']),
      );
      credBuilder.setTopLevelField('type', JSON.stringify(document.type));

      // Allow for relaxed schema generation, then embed the generated schema directly into the credential
      const builtAnoncreds = credBuilder.updateSchemaIfNeeded(signingOptions);

      // Re-assign the embedded schema to the document schema object
      // this is a bit hacky, but its the only way right now
      if (document.credentialSchema) {
        const fullSchema = builtAnoncreds.credentialSchema;
        Object.assign(document.credentialSchema, typeof fullSchema === 'string' ? JSON.parse(fullSchema) : fullSchema);
      }

      // Return the built anoncreds credential and the schema associated
      return [builtAnoncreds, credBuilder.schema];
    }

    /**
     * Convert given JSON-LD credential to TS-anoncred's credential for adding to a presentation. This would have the signature.
     * @param document - JSON-LD credential
     * @param explicitProof
     * @returns {Credential}
     */
    static convertCredentialForPresBuilding({
      document,
      proof: explicitProof /* documentLoader */,
    }) {
      const [trimmedProof, proofVal] = this.getTrimmedProofAndValue(document, explicitProof);

      const [credSchema, wasLegacySchema] = this.extractSchema(document);

      const credJson = {
        ...document,
        proof: trimmedProof,
      };
      this.revealMandatoryFields(credJson, document);
      const cred = this.Credential.fromJSON(credJson, CustomLinkedDataSignature.fromJsigProofValue(proofVal));
      if (!wasLegacySchema) {
        cred.schema = CredentialSchema.generateAppropriateSchema(credJson, credSchema);
      }

      return cred;
    }

    /**
     * Convert given JSON-LD credential to TS-anoncred's credential. This would have the signature.
     * @param document - JSON-LD credential
     * @param explicitProof
     * @returns {Array}
     */
    static convertCredentialForVerification({
      document,
      proof: explicitProof /* documentLoader */,
    }) {
      const [trimmedProof] = this.getTrimmedProofAndValue(document, explicitProof);

      const s = this.extractSchema(document);
      let credSchema = s[0];
      const wasLegacySchema = s[1];

      const credJson = {
        ...document,
        proof: trimmedProof,
      };
      this.revealMandatoryFields(credJson, document);
      if (!wasLegacySchema) {
        // Older credentials didn't include the version field in the final credential but they did while signing
        credJson.cryptoVersion = '0.2.0';
        if (credJson.credentialSchema === undefined) {
          credJson.credentialSchema = JSON.stringify(credSchema.toJSON());
        }
        credSchema = CredentialSchema.generateAppropriateSchema(credJson, credSchema);
      }
      const schemaJson = credSchema.toJSON();
      // Older versions used JSON.stringify but newer use deterministic conversion
      credJson.credentialSchema = wasLegacySchema ? stringify(schemaJson) : JSON.stringify(schemaJson);

      if (document.credentialSchema) {
        Object.assign(document.credentialSchema, schemaJson);
      }

      return [credJson, credSchema];
    }

    /**
     * Convert given JSON-LD credential to TS-anoncred's credential. This would not have the signature.
     * @param document - JSON-LD credential
     * @param explicitProof
     * @returns {Promise<Array>}
     */
    static async convertCredentialToSerializedForSigning({
      document,
      proof,
      documentLoader,
    }) {
      const [trimmedProof] = this.getTrimmedProofAndValue(document, proof);

      const [credSchema] = await this.extractSchemaForSigning(document, documentLoader);

      const credBuilder = new this.CredentialBuilder();
      credBuilder.schema = credSchema;

      // Extract top level fields from the document aside from these
      const {
        credentialSchema: _credentialSchema,
        credentialSubject,
        credentialStatus,
        ...topLevelFields
      } = {
        ...document,
        proof: trimmedProof,
      };
      credBuilder.subject = credentialSubject;
      credBuilder.credStatus = credentialStatus;

      // Add all other top level fields to the credential
      Object.keys(topLevelFields)
        .sort()
        .forEach((k) => {
          credBuilder.setTopLevelField(k, topLevelFields[k]);
        });

      // To work with JSON-LD credentials/presentations, we must always reveal the context and type
      // NOTE: that they are encoded as JSON strings here to reduce message count and so its *always known*
      credBuilder.setTopLevelField(
        '@context',
        JSON.stringify(document['@context']),
      );
      credBuilder.setTopLevelField('type', JSON.stringify(document.type));

      const serializedCred = credBuilder.serializeForSigning();

      credBuilder.schema = CredentialSchema.generateAppropriateSchema(serializedCred, credSchema);

      // Update `document` so that generated credential has `credentialSchema` and `cryptoVersion` set
      const updatedSchemaJson = credBuilder.schema.toJSON();
      serializedCred.credentialSchema = stringify(updatedSchemaJson);
      Object.assign(document.credentialSchema, updatedSchemaJson);
      // eslint-disable-next-line no-param-reassign
      document.cryptoVersion = serializedCred.cryptoVersion;

      return [serializedCred, credBuilder.schema];
    }

    /**
     * To work with JSON-LD credentials/presentations, we must always reveal the context, type
     * @param credJson
     * @param document
     */
    static revealMandatoryFields(credJson, document) {
      // NOTE: that they are encoded as JSON strings here to reduce message count and so its *always known*
      // eslint-disable-next-line no-param-reassign
      credJson['@context'] = JSON.stringify(document['@context']);
      // eslint-disable-next-line no-param-reassign
      credJson.type = JSON.stringify(document.type);
    }

    /**
     * Remove actual value of proof (signature) from the object and return the trimmed object and the proof value
     * @param document
     * @param explicitProof
     * @returns {Array}
     */
    static getTrimmedProofAndValue(document, explicitProof) {
      const proof = explicitProof || document.proof;
      if (proof.type !== this.proofType[0]) {
        throw new Error(
          `Invalid \`proof.type\`, expected ${this.proofType[0]}, received ${proof.type}`,
        );
      }
      // `jws`,`signatureValue`,`proofValue` must not be included in the proof
      const trimmedProof = {
        '@context': document['@context'] || SECURITY_CONTEXT_URL,
        ...proof,
      };

      const proofVal = trimmedProof.proofValue;

      delete trimmedProof.jws;
      delete trimmedProof.signatureValue;
      delete trimmedProof.proofValue;
      return [trimmedProof, proofVal];
    }

    /**
     * Extract schema from the document and load the schema from its id/reference if needed.
     * @param document
     * @param documentLoader
     * @returns {Promise<Array>}
     */
    static async extractSchemaForSigning(document, documentLoader) {
      let credSchema;
      // Should be false for legacy cases or when the schema is generated by CredentialBuilder
      let wasExactSchema = true;

      if (document.credentialSchema && document.credentialSchema.id) {
        /**
         * Fetch a schema given a schema id. Currenly only fetching it from Dock blockchain
         * @param schemaId
         * @returns {Promise<Object>}
         */
        // eslint-disable-next-line no-inner-declarations
        async function getSchema(schemaId) {
          if (!schemaId.startsWith('blob:dock:')) {
            throw new Error(`Can only fetch schemas stored on Dock for now. Got schema id ${schemaId}`);
          }
          const { document: schema } = await documentLoader(schemaId);
          // schema[0] is the schema/blob id
          return schema[1];
        }

        // If we already have a schema to use, add that first and then generate relaxed values later on
        credSchema = await CredentialSchema.fromJSONWithPotentiallyExternalSchema({
          // Passing all the default parsing options. Ideally `document.credentialSchema` should contain these
          parsingOptions: DefaultSchemaParsingOpts,
          ...document.credentialSchema,
        }, getSchema);
      } else {
        credSchema = this.extractSchemaWhenIdNotSet(document);
        wasExactSchema = false;
      }
      return [credSchema, wasExactSchema];
    }

    static extractSchema(document) {
      let credSchema;
      // Should be false for legacy cases
      let wasExactSchema = true;

      if (document.credentialSchema && document.credentialSchema.id) {
        // If we already have a schema to use, add that first and then generate relaxed values later on
        credSchema = CredentialSchema.fromJSON({
          // Passing all the default parsing options. Ideally `document.credentialSchema` should contain these
          parsingOptions: DefaultSchemaParsingOpts,
          ...document.credentialSchema,
        });
      } else {
        credSchema = this.extractSchemaWhenIdNotSet(document);
        wasExactSchema = false;
      }
      return [credSchema, wasExactSchema];
    }

    static extractSchemaWhenIdNotSet(document) {
      let credSchema;
      if (document.credentialSchema) {
        // schema object exists but no ID means the SDK is signalling for the suite to generate a schema
        credSchema = new CredentialSchema(CredentialSchema.essential());
      } else {
        // Else, no schema was found so just use the essentials and v0.0.1 schema version
        // NOTE: version is important here and MUST be 0.0.1 otherwise it will invalidate BBS+ credentials
        // that were issued before a change. This is required because the version value is not known in credentials
        // where no credentialSchema object is defined
        credSchema = new CredentialSchema(
          CredentialSchema.essential(),
          // Passing old parsing options and version
          {
            useDefaults: false,
            defaultMinimumInteger: -((2 ** 32) - 1),
            defaultDecimalPlaces: 0,
          },
          false,
          { version: '0.0.1' },
        );
      }

      return credSchema;
    }

    /**
     * @param document {object} to be signed.
     * @param proof {object}
     * @param documentLoader {function}
     * @param expansionMap {function}
     */
    static async getVerificationMethod({ proof, documentLoader }) {
      let { verificationMethod } = proof;
      if (typeof verificationMethod === 'object') {
        verificationMethod = verificationMethod.id;
      }
      if (!verificationMethod) {
        throw new Error('No "verificationMethod" found in proof.');
      }
      // Note: `expansionMap` is intentionally not passed; we can safely drop
      // properties here and must allow for it
      const result = await jsonld.frame(
        verificationMethod,
        {
          '@context': SECURITY_CONTEXT_URL,
          '@embed': '@always',
          id: verificationMethod,
        },
        {
          documentLoader,
          compactToRelative: false,
          expandContext: SECURITY_CONTEXT_URL,
        },
      );
      if (!result) {
        throw new Error(`Verification method ${verificationMethod} not found.`);
      }
      // ensure verification method has not been revoked
      if (result.revoked !== undefined) {
        throw new Error('The verification method has been revoked.');
      }
      return result;
    }

    /**
     * @param document {object} to be signed.
     * @param proof {object}
     * @param documentLoader {function}
     * @param expansionMap {function}
     */
    async getVerificationMethod({ proof, documentLoader }) {
      return this.constructor.getVerificationMethod({
        proof,
        documentLoader,
      });
    }

    /**
     * Generate object with `sign` method
     * @param keypair
     * @param verificationMethod
     * @returns {object}
     */
    static signerFactory(keypair, verificationMethod) {
      const { KeyPair } = this;

      return {
        id: verificationMethod,
        async sign({ data }) {
          if (!keypair || !keypair.privateKeyBuffer) {
            throw new Error('No private key to sign with.');
          }

          const msgCount = data.length;
          const sigParams = KeyPair.SignatureParams.getSigParamsOfRequiredSize(
            msgCount,
            KeyPair.defaultLabelBytes,
          );
          const sk = KeyPair.adaptKey(
            new KeyPair.SecretKey(u8aToU8a(keypair.privateKeyBuffer)),
            data.length,
          );
          const signature = KeyPair.Signature.generate(data, sk, sigParams);
          return signature.value;
        },
      };
    }

    ensureSuiteContext() {
      // no-op
    }
  },
);
