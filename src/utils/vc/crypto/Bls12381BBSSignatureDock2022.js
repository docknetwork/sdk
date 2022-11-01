import {
  CredentialSchema, SIGNATURE_PARAMS_LABEL_BYTES,
} from '@docknetwork/crypto-wasm-ts/lib/anonymous-credentials';

import {
  initializeWasm,
  SignatureG1,
  BBSPlusSecretKey,
  getSigParamsOfRequiredSize,
} from '@docknetwork/crypto-wasm-ts';

import jsonld from 'jsonld';
import { SECURITY_CONTEXT_URL } from 'jsonld-signatures';
import { Bls12381BBSSigDockSigName } from './constants';

import Bls12381BBSKeyDock2022 from './Bls12381BBSKeyDock2022';
import CustomLinkedDataSignature from './custom-linkeddatasignature';

const SUITE_CONTEXT_URL = 'https://www.w3.org/2018/credentials/v1';

const DEFAULT_PARSING_OPTS = {
  useDefaults: true,
};

/**
 * A BBS+ signature suite for use with BLS12-381 Dock key pairs
 */
export default class Bls12381BBSSignatureDock2022 extends CustomLinkedDataSignature {
  /**
   * Default constructor
   * @param options {SignatureSuiteOptions} options for constructing the signature suite
   */
  constructor(options = {}) {
    const {
      verificationMethod, signer, keypair, verifier,
    } = options;

    super({
      type: Bls12381BBSSigDockSigName,
      LDKeyClass: Bls12381BBSKeyDock2022,
      contextUrl: SUITE_CONTEXT_URL,
      alg: 'BLS12-381',
      signer: signer || Bls12381BBSSignatureDock2022.signerFactory(keypair, verificationMethod),
      verifier,
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
        'https://ld.dock.io/security/bbs/v1',
      ],
      type: Bls12381BBSSigDockSigName,
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
    const serializedCredential = await this.serializeForSigning(options);

    // Create an encoder through the schema, if one exists
    let credSchema;
    const { credentialSchema } = options.document;
    if (credentialSchema) {
      credSchema = CredentialSchema.fromJSON({
        ...credentialSchema,
        parsingOptions: {
          ...DEFAULT_PARSING_OPTS,
          ...(credentialSchema.parsingOptions || {}),
        },
      });
    } else {
      throw new Error('Credential must define credentialSchema');
    }

    // Encode messages, retrieve names/values array
    const namesValues = credSchema.encoder.encodeMessageObject(serializedCredential, SIGNATURE_PARAMS_LABEL_BYTES);
    return namesValues[1];
  }

  async serializeForSigning({
    document, proof,
  }) {
    // `jws`,`signatureValue`,`proofValue` must not be included in the proof
    const trimmedProof = {
      '@context': document['@context'] || SECURITY_CONTEXT_URL,
      ...proof,
    };
    delete trimmedProof.jws;
    delete trimmedProof.signatureValue;
    delete trimmedProof.proofValue;

    return {
      proof: trimmedProof,
      ...document,
    };
  }

  /**
   * @param document {object} to be signed.
   * @param proof {object}
   * @param documentLoader {function}
   * @param expansionMap {function}
   */
  async getVerificationMethod({ proof, documentLoader }) {
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
        const sigParams = getSigParamsOfRequiredSize(msgCount, SIGNATURE_PARAMS_LABEL_BYTES);
        const signature = SignatureG1.generate(data, new BBSPlusSecretKey(keypair.privateKeyBuffer), sigParams, false);
        return signature.value;
      },
    };
  }

  ensureSuiteContext() {
    // no-op
  }
}

Bls12381BBSSignatureDock2022.proofType = [
  Bls12381BBSSigDockSigName,
  `sec:${Bls12381BBSSigDockSigName}`,
  `https://w3id.org/security#${Bls12381BBSSigDockSigName}`,
];
