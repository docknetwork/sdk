/**
 * Creates a function to convert a derived proof credential to the native presentation
 * format with the provided type.
 * @param {*} proofType
 * @returns {function(object): object}
 */
export const buildPresentationConverter = (proofType) => function convertToPresentation(document) {
  const {
    '@context': context,
    type,
    credentialSchema,
    issuer,
    issuanceDate,
    proof,
    ...revealedAttributes
  } = document;

  return {
    version: '0.1.0',
    nonce: proof.nonce,
    context: proof.context,
    spec: {
      credentials: [
        {
          version: proof.version,
          schema: JSON.stringify(credentialSchema),
          revealedAttributes: {
            proof: {
              type: proofType,
              verificationMethod: proof.verificationMethod,
            },
            '@context': JSON.stringify(context),
            type: JSON.stringify(type),
            ...revealedAttributes,
          },
        },
      ],
      attributeEqualities: proof.attributeEqualities,
    },
    attributeCiphertexts: proof.attributeCiphertexts,
    proof: proof.proofValue,
  };
};
