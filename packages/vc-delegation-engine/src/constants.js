export const VC_NS = 'https://www.w3.org/2018/credentials#';
export const SECURITY_NS = 'https://w3id.org/security#';
export const VC_TYPE = `${VC_NS}VerifiablePresentation`;
export const VC_VC = `${VC_NS}verifiableCredential`;
export const VC_ISSUER = `${VC_NS}issuer`;
export const VC_SUBJECT = `${VC_NS}credentialSubject`;
export const SECURITY_PROOF = `${SECURITY_NS}proof`;
export const SECURITY_VERIFICATION_METHOD = `${SECURITY_NS}verificationMethod`;

export const MAY_CLAIM_IRI = 'https://rdf.dock.io/alpha/2021#mayClaim';
export const MAY_CLAIM_ALIAS_KEYS = [MAY_CLAIM_IRI, 'mayClaim'];

export const DELEGATION_NS = 'https://ld.truvera.io/credentials/delegation#';
export const VC_TYPE_DELEGATION_CREDENTIAL = `${DELEGATION_NS}DelegationCredential`;
export const VC_PREVIOUS_CREDENTIAL_ID = `${DELEGATION_NS}previousCredentialId`;
export const VC_ROOT_CREDENTIAL_ID = `${DELEGATION_NS}rootCredentialId`;

export const ACTION_VERIFY = 'Verify';
export const VERIFY_CHAIN_ID = 'Action:Verify';
export const UNKNOWN_IDENTIFIER = 'unknown';
export const UNKNOWN_ACTOR_ID = UNKNOWN_IDENTIFIER;
