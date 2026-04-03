import { MAY_CLAIM_IRI, MAY_CLAIM_ALIAS_KEYS } from '../constants.js';

export const RESERVED_SUBJECT_KEYS = new Set(['id', MAY_CLAIM_IRI, ...MAY_CLAIM_ALIAS_KEYS]);
