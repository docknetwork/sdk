import { shortenTerm } from '../jsonld-utils.js';
import { VC_NS, VC_TYPE_DELEGATION_CREDENTIAL } from '../constants.js';

export const CONTROL_PREDICATES = new Set(['allows', 'delegatesTo', 'listsClaim', 'inheritsParent']);

export const DELEGATION_TYPE_NAME = shortenTerm(VC_TYPE_DELEGATION_CREDENTIAL);

export const RESERVED_RESOURCE_TYPES = new Set([
  `${VC_NS}VerifiableCredential`,
  'VerifiableCredential',
  VC_TYPE_DELEGATION_CREDENTIAL,
  'DelegationCredential',
]);

export const VC_JWT_PATTERN = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
export const VC_JWT_ID_PREFIX = 'urn:vcjwt:';

export const AUTHORIZED_GRAPH_PREFIX = 'urn:authorized';
