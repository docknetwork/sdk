import { CredentialSchema } from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import { initializeWasm } from '@docknetwork/crypto-wasm-ts';

import jsonld from 'jsonld';
import { SECURITY_CONTEXT_URL } from 'jsonld-signatures';

import { u8aToU8a } from '@polkadot/util';
import CustomLinkedDataSignature from './CustomLinkedDataSignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export const DEFAULT_PARSING_OPTS = {
  useDefaults: false,
};

/**
 * Defines commons for the `@docknetwork/crypto-wasm-ts` signatures.
 */
export default class DockCryptoSignature extends CustomLinkedDataSignature {
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
   * @returns {Promise<{Uint8Array}>}.
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

  static convertCredential(
    {
      document,
      proof: explicitProof /* documentLoader */,
      signingOptions = { requireAllFieldsFromSchema: false },
    },
    expectedType,
    CredentialBuilder,
  ) {
    const proof = explicitProof || document.proof;
    if (proof.type !== expectedType) {
      throw new Error(
        `Invalid \`proof.type\`, expected ${expectedType}, received ${proof.type}`,
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
    if (document.credentialSchema) {
      credSchema = CredentialSchema.fromJSON({
        parsingOptions: DEFAULT_PARSING_OPTS,
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

    if (!credSchema) {
      credSchema = new CredentialSchema(
        CredentialSchema.essential(),
        DEFAULT_PARSING_OPTS,
      );
    }

    const credBuilder = new CredentialBuilder();
    credBuilder.schema = credSchema;

    const {
      cryptoVersion: _cryptoVersion,
      credentialSchema: _credentialSchema,
      credentialSubject,
      credentialStatus,
      ...custom
    } = {
      ...document,
      proof: trimmedProof,
    };
    credBuilder.subject = credentialSubject;
    credBuilder.credStatus = credentialStatus;

    Object.keys(custom)
      .sort()
      .forEach((k) => {
        credBuilder.setTopLevelField(k, custom[k]);
      });

    credBuilder.setTopLevelField(
      '@context',
      JSON.stringify(document['@context']),
    );
    credBuilder.setTopLevelField('type', JSON.stringify(document.type));

    const retval = credBuilder.updateSchemaIfNeeded(signingOptions);
    return [retval, credBuilder.schema];
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
   * @param SecretKey
   * @param SignatureParams
   * @param Signature
   * @param DefaultLabelBytes
   * @returns {object}
   */
  static signerFactoryForSigScheme(
    keypair,
    verificationMethod,
    SecretKey,
    SignatureParams,
    Signature,
    DefaultLabelBytes,
  ) {
    if (SecretKey == null) {
      throw new Error('No `SecretKey` provided');
    } else if (SignatureParams == null) {
      throw new Error('No `SignatureParams` provided');
    } else if (Signature == null) {
      throw new Error('No `Signature` provided');
    }

    const { adaptKey } = this;

    return {
      id: verificationMethod,
      async sign({ data }) {
        if (!keypair || !keypair.privateKeyBuffer) {
          throw new Error('No private key to sign with.');
        }

        const msgCount = data.length;
        const sigParams = SignatureParams.getSigParamsOfRequiredSize(
          msgCount,
          DefaultLabelBytes,
        );
        const sk = adaptKey(
          new SecretKey(u8aToU8a(keypair.privateKeyBuffer)),
          data.length,
        );
        const signature = Signature.generate(data, sk, sigParams);
        return signature.value;
      },
    };
  }

  /**
   * Adapts the provided public or secret key for the given message count.
   * @param {*} key
   * @param {*} _msgCount
   */
  static adaptKey(key, _msgCount) {
    return key;
  }

  ensureSuiteContext() {
    // no-op
  }
}
