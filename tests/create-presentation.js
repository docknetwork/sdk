import {
  DEFAULT_CONTEXT_V1_URL,
} from '../src/utils/vc/constants';

/**
 * Create an unsigned Verifiable Presentation
 * @param {object|Array<object>} verifiableCredential - verifiable credential (or an array of them) to be bundled as a presentation.
 * @param {string} id - optional verifiable presentation id to use
 * @param {string} [holder] - optional presentation holder url
 * @return {object} verifiable presentation.
 */
export function createPresentation(verifiableCredential, id, holder = null) {
  const presentation = {
    '@context': [DEFAULT_CONTEXT_V1_URL],
    type: ['VerifiablePresentation'],
  };

  if (verifiableCredential) {
    const credentials = [].concat(verifiableCredential);
    presentation.verifiableCredential = credentials;
  }
  if (id) {
    presentation.id = id;
  }
  if (holder) {
    presentation.holder = holder;
  }

  return presentation;
}
