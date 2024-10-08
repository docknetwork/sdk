/*!
 * Copyright (c) 2019-2020 Digital Bazaar, Inc. All rights reserved.
 */

import jsonld from 'jsonld';
import jsigs from 'jsonld-signatures';
import { expandJSONLD } from './helpers';
import { Bls12381BBDT16MacProofDockName } from './crypto/constants';

const { AssertionProofPurpose } = jsigs.purposes;

/**
 * Creates a proof purpose that will validate whether or not the verification
 * method in a proof was authorized by its declared controller for the
 * proof's purpose.
 */
export default class CredentialIssuancePurpose extends AssertionProofPurpose {
  /**
   * @param {object} options - The options to use.
   * @param {object} [options.controller] - The description of the controller,
   *   if it is not to be dereferenced via a `documentLoader`.
   * @param {string|Date|number} [options.date] - The expected date for
   *   the creation of the proof.
   * @param {number} [options.maxTimestampDelta=Infinity] - A maximum number
   *   of seconds that the date on the signature can deviate from.
   */
  constructor({ controller, date, maxTimestampDelta } = {}) {
    super({ controller, date, maxTimestampDelta });
  }

  /**
   * Validates the purpose of a proof. This method is called during
   * proof verification, after the proof value has been checked against the
   * given verification method (in the case of a digital signature, the
   * signature has been cryptographically verified against the public key).
   *
   * @param {object} proof - The proof to validate.
   * @param {object} options - The options to use.
   * @param {object} options.document - The document whose signature is
   *   being verified.
   * @param {object} options.suite - Signature suite used in
   *   the proof.
   * @param {string} options.verificationMethod - Key id URL to the paired
   *   public key.
   * @param {object} [options.documentLoader] - A document loader.
   * @param {object} [options.expansionMap] - An expansion map.
   *
   * @throws {Error} If verification method not authorized by controller.
   * @throws {Error} If proof's created timestamp is out of range.
   *
   * @returns {Promise<{valid: boolean, error: Error}>} Resolves on completion.
   */
  async validate(
    proof,
    {
      document, suite, verificationMethod, documentLoader, expansionMap,
    },
  ) {
    try {
      if (proof.type === Bls12381BBDT16MacProofDockName) {
        return { valid: true, error: null };
      }
      const result = await super.validate(proof, {
        document,
        suite,
        verificationMethod,
        documentLoader,
        expansionMap,
      });

      if (!result.valid) {
        throw result.error;
      }

      const expandedDoc = await expandJSONLD(document, {
        documentLoader,
      });

      const issuer = jsonld.getValues(
        expandedDoc,
        'https://www.w3.org/2018/credentials#issuer',
      );

      if (!issuer || issuer.length === 0) {
        throw new Error('Credential issuer is required.');
      }

      if (result.controller.id !== issuer[0]['@id']) {
        throw new Error(
          'Credential issuer must match the verification method controller.',
        );
      }

      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error };
    }
  }
}
