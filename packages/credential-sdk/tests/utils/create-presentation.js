import VerifiablePresentation from "../../src/vc/verifiable-presentation";

/**
 * Create an unsigned Verifiable Presentation
 * @param {object|Array<object>} verifiableCredential - verifiable credential (or an array of them) to be bundled as a presentation.
 * @param {string} id - optional verifiable presentation id to use
 * @param {string} [holder] - optional presentation holder url
 * @return {object} verifiable presentation.
 */
export function createPresentation(
  verifiableCredential,
  id = "http://example.edu/presentation/2803",
  holder = null
) {
  const presentation = new VerifiablePresentation(id);
  if (Array.isArray(verifiableCredential)) {
    presentation.addCredentials(verifiableCredential);
  } else {
    presentation.addCredential(verifiableCredential);
  }
  if (holder) {
    presentation.setHolder(String(holder));
  }
  return presentation.toJSON();
}
