import { CredentialSchema, DefaultSchemaParsingOpts } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import { initializeWasm } from '@docknetwork/crypto-wasm-ts';

import jsonld from 'jsonld';
import { SECURITY_CONTEXT_URL } from 'jsonld-signatures';

import { u8aToU8a } from '@polkadot/util';
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
  ['KeyPair', 'CredentialBuilder', 'proofType'],
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

    /**
     * @param {object} options - The options to use.
     * @param {object} options.document - The document to be signed/verified.
     * @param {object} options.proof - The proof to be verified.
     * @param {function} options.documentLoader - The document loader to use.
     * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
     * @param {labelBytes} - bytes to be used for the params label
     *
     * @returns {Promise<Uint8Array[]>}.
     */
    async createVerifyData(options, labelBytes) {
      await initializeWasm();

      // Serialize the data for signing
      const [serializedCredential, credSchema] = this.constructor.convertCredential(options);

      // Encode messages, retrieve names/values array
      const nameValues = credSchema.encoder.encodeMessageObject(
        serializedCredential,
        labelBytes,
      );
      return nameValues[1];
    }

    static convertCredential({
      document,
      proof: explicitProof /* documentLoader */,
      signingOptions = { requireAllFieldsFromSchema: false },
    }) {
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

      delete trimmedProof.jws;
      delete trimmedProof.signatureValue;
      delete trimmedProof.proofValue;

      let credSchema;

      // If we already have a schema to use, add that first and then generate relaxed values later on
      if (document.credentialSchema && document.credentialSchema.id) {
        credSchema = CredentialSchema.fromJSON({
          // Passing all the default parsing options. Ideally `document.credentialSchema` should contain these
          parsingOptions: DefaultSchemaParsingOpts,
          ...document.credentialSchema,
        });
        // TODO: support documentloader for schemas here so we can use dock chain schemas
        // requires that the presentation wrapper passes a documentloader to this method
        // const loadedSchema = (await documentLoader(document.credentialSchema.id)).document;
        // if (loadedSchema) {
        //   credSchema = new CredentialSchema(loadedSchema, {
        //     ...DEFAULT_PARSING_OPTS,
        //     ...(document.credentialSchema.parsingOptions || {}),
        //   });
        // }
      }

      // Else, schema object exists but no ID means the SDK is signalling for the suite to generate a schema
      if (!credSchema && document.credentialSchema) {
        credSchema = new CredentialSchema(CredentialSchema.essential());
      }

      // Else, no schema was found so just use the essentials and v0.0.1 schema version
      // NOTE: version is important here and MUST be 0.0.1 otherwise it will invalidate BBS+ credentials
      // that were issued before a change. This is required because the version value is not known in credentials
      // where no credentialSchema object is defined
      if (!credSchema) {
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

      const credBuilder = new this.CredentialBuilder();
      credBuilder.schema = credSchema;

      // Extract top level fields from the document aside from these ones
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
