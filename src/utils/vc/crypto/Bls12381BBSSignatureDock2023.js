import {
  CredentialSchema, BBSCredentialBuilder, BBS_SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import {
  initializeWasm,
  BBSSignature,
  BBSSecretKey,
  BBSSignatureParams,
} from '@docknetwork/crypto-wasm-ts';

import jsonld from 'jsonld';
import { SECURITY_CONTEXT_URL } from 'jsonld-signatures';
import { Bls12381BBS23SigDockSigName } from './constants';

import Bls12381BBSKeyPairDock2023 from './Bls12381BBSKeyPairDock2023';
import CustomLinkedDataSignature from './custom-linkeddatasignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

export const DEFAULT_PARSING_OPTS = {
  useDefaults: false,
};

/**
 * A BBS signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBSSignatureDock2023 extends CustomLinkedDataSignature {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    const {
      verificationMethod, signer, keypair, verifier,
    } = options;

    super({
      type: Bls12381BBS23SigDockSigName,
      LDKeyClass: Bls12381BBSKeyPairDock2023,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'Bls12381BBSSignatureDock2023',
      signer: signer || Bls12381BBSSignatureDock2023.signerFactory(keypair, verificationMethod),
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
        'https://ld.dock.io/security/bbs23/v1',
      ],
      type: Bls12381BBS23SigDockSigName,
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
   *
   * @returns {Promise<{Uint8Array}>}.
   */
  async createVerifyData(options) {
    await initializeWasm();

    // Serialize the data for signing
    const [serializedCredential, credSchema] = Bls12381BBSSignatureDock2023.convertCredential(options);

    // Encode messages, retrieve names/values array
    const nameValues = credSchema.encoder.encodeMessageObject(serializedCredential, BBS_SIGNATURE_PARAMS_LABEL_BYTES);
    return nameValues[1];
  }

  static convertCredential({
    document, proof, /* documentLoader */
    signingOptions = { requireAllFieldsFromSchema: false },
  }) {
    proof ||= document.proof;
    if (proof.type !== Bls12381BBS23SigDockSigName) {
      throw new Error(`Invalid \`proof.type\`, expected ${Bls12381BBS23SigDockSigName}, received ${proof.type}`)
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
      credSchema = new CredentialSchema(CredentialSchema.essential(), DEFAULT_PARSING_OPTS);
    }

    const credBuilder = new BBSCredentialBuilder();
    credBuilder.schema = credSchema;

    const {
      cryptoVersion, credentialSchema, credentialSubject, credentialStatus, ...custom
    } = {
      ...document,
      proof: trimmedProof,
    };
    credBuilder.subject = credentialSubject;
    credBuilder.credStatus = credentialStatus;

    Object.keys(custom).sort().forEach((k) => {
      credBuilder.setTopLevelField(k, custom[k]);
    });

    credBuilder.setTopLevelField('@context', JSON.stringify(document['@context']));
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
    return Bls12381BBSSignatureDock2023.getVerificationMethod({ proof, documentLoader });
  }

  /**
   * Generate object with `sign` method
   * @param keypair
   * @returns {object}
   */
  static signerFactory(keypair, verificationMethod) {
    return {
      id: verificationMethod,
      async sign({ data }) {
        if (!keypair || !keypair.privateKeyBuffer) {
          throw new Error('No private key to sign with.');
        }

        const msgCount = data.length;
        const sigParams = BBSSignatureParams.getSigParamsOfRequiredSize(msgCount, BBS_SIGNATURE_PARAMS_LABEL_BYTES);
        const signature = BBSSignature.generate(data, new BBSSecretKey(keypair.privateKeyBuffer), sigParams, false);
        return signature.value;
      },
    };
  }

  ensureSuiteContext() {
    // no-op
  }
}

Bls12381BBSSignatureDock2023.proofType = [
  Bls12381BBS23SigDockSigName,
  `sec:${Bls12381BBS23SigDockSigName}`,
  `https://w3id.org/security#${Bls12381BBS23SigDockSigName}`,
];
