// XXX: Does it make sense to have a revocation registry type for Dock like below and eliminate the need for `rev_reg:dock:`?
// export const RevRegType = 'DockRevocationRegistry2020';
export const RevRegType = 'CredentialStatusList2017';
export const DockRevRegQualifier = 'rev-reg:dock:';
export const DEFAULT_TYPE = 'VerifiableCredential';
export const DEFAULT_CONTEXT_URL = 'https://www.w3.org/2018/credentials';
export const DEFAULT_CONTEXT = `${DEFAULT_CONTEXT_URL}/v1`;
export const DEFAULT_CONTEXT_V1_URL = 'https://www.w3.org/2018/credentials/v1';
export const expandedStatusProperty = `${DEFAULT_CONTEXT_URL}#credentialStatus`;
export const expandedCredentialProperty = `${DEFAULT_CONTEXT_URL}#verifiableCredential`;
export const expandedSubjectProperty = `${DEFAULT_CONTEXT_URL}#credentialSubject`;
export const expandedSchemaProperty = `${DEFAULT_CONTEXT_URL}#credentialSchema`;
export const credentialIDField = '@id';
export const credentialContextField = '@context';
export const credentialTypeField = '@type';
