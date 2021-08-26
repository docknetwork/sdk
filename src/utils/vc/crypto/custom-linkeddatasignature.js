import { suites } from 'jsonld-signatures';

const base58btc from 'base58-universal';
const base64url from 'base64url';

const MULTIBASE_BASE58BTC_HEADER = 'z';

function createJws({ encodedHeader, verifyData }) {
  const buffer = Buffer.concat([
    Buffer.from(`${encodedHeader}.`, 'utf8'),
    Buffer.from(verifyData.buffer, verifyData.byteOffset, verifyData.length),
  ]);
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
}

function decodeBase64Url(string) {
  const buffer = base64url.toBuffer(string);
  return new Uint8Array(buffer.buffer, buffer.offset, buffer.length);
}

function decodeBase64UrlToString(string) {
  return base64url.decode(string);
}

export default class CustomLinkedDataSignature extends suites.LinkedDataSignature {
  /**
   * Creates a new CustomLinkedDataSignature instance
   * @constructor
   * @param {object} config - Configuration options
   */
  constructor(config) {
    super(config);
    this.alg = config.alg;
  }

  /**
   * Verifies the proof signature against the given data.
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.verifyData - Canonicalized hashed data.
   * @param {object} options.verificationMethod - Key object.
   * @param {object} options.proof - The proof to be verified.
   *
   * @returns {Promise<boolean>} Resolves with the verification result.
   */
  async verifySignature({ verifyData, verificationMethod, proof }) {
    let signatureBytes;
    let data = verifyData;

    const { proofValue, jws } = proof;
    if (proofValue && typeof proofValue === 'string') {
      if (proofValue[0] !== MULTIBASE_BASE58BTC_HEADER) {
        throw new Error('Only base58btc multibase encoding is supported.');
      }
      signatureBytes = base58btc.decode(proofValue.substr(1));
    } else if (jws && typeof jws === 'string') { // Fallback to older jsonld-signature implementations
      const [encodedHeader, /* payload */, encodedSignature] = jws.split('.');

      let header;
      try {
        header = JSON.parse(decodeBase64UrlToString(encodedHeader));
      } catch (e) {
        throw new Error(`Could not parse JWS header; ${e}`);
      }
      if (!(header && typeof header === 'object')) {
        throw new Error('Invalid JWS header.');
      }

      // confirm header matches all expectations
      if (!(header.alg === this.alg && header.b64 === false
        && Array.isArray(header.crit) && header.crit.length === 1
        && header.crit[0] === 'b64')) {
        throw new Error(
          `Invalid JWS header parameters for ${this.type}.`,
        );
      }

      signatureBytes = decodeBase64Url(encodedSignature);
      data = createJws({ encodedHeader, verifyData });
    }

    let { verifier } = this;
    if (!verifier) {
      const key = await this.LDKeyClass.from(verificationMethod);
      verifier = key.verifier();
    }
    return verifier.verify({ data, signature: signatureBytes });
  }

  /**
   * Adds a signature (proofValue) field to the proof object. Called by
   * LinkedDataSignature.createProof().
   *
   * @param {object} options - The options to use.
   * @param {Uint8Array} options.verifyData - Data to be signed (extracted
   *   from document, according to the suite's spec).
   * @param {object} options.proof - Proof object (containing the proofPurpose,
   *   verificationMethod, etc).
   *
   * @returns {Promise<object>} Resolves with the proof containing the signature
   *   value.
   */
  async sign({ verifyData, proof }) {
    if (!(this.signer && typeof this.signer.sign === 'function')) {
      throw new Error('A signer API has not been specified.');
    }

    const signatureBytes = await this.signer.sign({ data: verifyData });
    return {
      ...proof,
      proofValue: MULTIBASE_BASE58BTC_HEADER + base58btc.encode(signatureBytes),
    };
  }
}
