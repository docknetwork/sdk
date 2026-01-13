import { PEX, PresentationSubmissionLocation, Status } from '@sphereon/pex';
import { JSONPath } from '@astronautlabs/jsonpath';
import { v4 as uuidv4 } from 'uuid';
import VerifiablePresentation from '../vc/verifiable-presentation';
import Presentation from '../vc/presentation';
import { applyEnforceBounds } from './pex-bounds';

const DEFAULT_LIMIT_DISCLOSURE_SUITES = [
  'Bls12381BBS+SignatureDock2022',
  'Bls12381BBSSignatureDock2023',
  'Bls12381PSSignatureDock2023',
  'Bls12381BBDT16MACDock2024',
];

const SELECTIVE_DISCLOSURE_SIGNATURE_TYPES = new Set(DEFAULT_LIMIT_DISCLOSURE_SUITES);

const pex = new PEX();

export const GeneratePresentationStatus = Object.freeze({
  SUCCESS: 'success',
  REQUIREMENTS_NOT_MET: 'requirements_not_met',
  SELECTIVE_DISCLOSURE_REQUIRED: 'selective_disclosure_required',
});

function ensurePresentationDefinition(pexRequest) {
  if (!pexRequest) {
    throw new Error('pexRequest is required');
  }

  if (pexRequest.presentationDefinition) {
    return pexRequest.presentationDefinition;
  }

  if (pexRequest.presentation_definition) {
    return pexRequest.presentation_definition;
  }

  return pexRequest;
}

function flattenAttributes(attributes) {
  if (!Array.isArray(attributes)) {
    return [];
  }
  return attributes.flatMap((attribute) => (Array.isArray(attribute) ? attribute : [attribute]));
}

function normalizeHolderDids({ explicitHolderDids = [], holderDid, holderKeyDoc }) {
  const dids = [...explicitHolderDids];
  const inferred = holderDid || holderKeyDoc?.controller;
  if (inferred && !dids.includes(inferred)) {
    dids.push(inferred);
  }
  return dids;
}

function requiresSelectiveDisclosure(presentationDefinition) {
  return presentationDefinition?.input_descriptors?.some(
    (descriptor) => descriptor?.constraints?.limit_disclosure === 'required',
  );
}

function dedupeAttributes(attributes = []) {
  return [...new Set(attributes)];
}

function isSelectiveDisclosureCredential(credential) {
  const proofType = credential?.proof?.type;
  return typeof proofType === 'string'
    && SELECTIVE_DISCLOSURE_SIGNATURE_TYPES.has(proofType);
}

function normalizeSelectiveDisclosureConfigs(configs = [], expectedLength) {
  if (!Array.isArray(configs)) {
    return Array(expectedLength).fill(undefined);
  }
  const normalized = [...configs];
  while (normalized.length < expectedLength) {
    normalized.push(undefined);
  }
  return normalized;
}

function normalizeAttributesConfig(attributes) {
  if (!attributes) {
    return undefined;
  }
  if (typeof attributes === 'string') {
    return [attributes];
  }
  if (Array.isArray(attributes?.[0])) {
    return flattenAttributes(attributes);
  }
  return Array.isArray(attributes) ? attributes : undefined;
}

function buildSelectiveDisclosureConfigs(selectiveDisclosure = {}, credentialCount) {
  if (!selectiveDisclosure) {
    return Array(credentialCount).fill(undefined);
  }

  let configs = selectiveDisclosure.credentials?.map((config) => {
    if (!config) {
      return undefined;
    }
    return {
      ...config,
      attributes: normalizeAttributesConfig(config.attributes),
    };
  });

  if (
    (!configs || configs.length === 0)
    && (
      selectiveDisclosure.attributes
      || selectiveDisclosure.witness
    )
  ) {
    configs = [{
      attributes: normalizeAttributesConfig(selectiveDisclosure.attributes),
      witness: selectiveDisclosure.witness,
    }];
  }

  return normalizeSelectiveDisclosureConfigs(configs, credentialCount);
}

export function filterCredentialsByPexRequest({
  credentials = [],
  pexRequest,
  holderDids = [],
  holderDid,
  holderKeyDoc,
  limitDisclosureSignatureSuites = DEFAULT_LIMIT_DISCLOSURE_SUITES,
  restrictToFormats,
  restrictToDIDMethods,
} = {}) {
  const presentationDefinition = ensurePresentationDefinition(pexRequest);
  const normalizedDids = normalizeHolderDids({ explicitHolderDids: holderDids, holderDid, holderKeyDoc });

  return pex.selectFrom(presentationDefinition, credentials, {
    holderDIDs: normalizedDids.length ? normalizedDids : undefined,
    limitDisclosureSignatureSuites,
    restrictToFormats,
    restrictToDIDMethods,
  });
}

export function evaluatePresentationAgainstDefinition({
  presentation,
  pexRequest,
  presentationSubmission,
  limitDisclosureSignatureSuites = DEFAULT_LIMIT_DISCLOSURE_SUITES,
  restrictToFormats,
  restrictToDIDMethods,
} = {}) {
  if (!presentation) {
    throw new Error('presentation is required');
  }

  const presentationDefinition = ensurePresentationDefinition(pexRequest);

  return pex.evaluatePresentation(presentationDefinition, presentation, {
    presentationSubmission,
    limitDisclosureSignatureSuites,
    restrictToFormats,
    restrictToDIDMethods,
  });
}

const attributesToSkip = [
  /^type/,
  /^issuer/,
  /^@context/,
  /^proof/,
  /^credentialSchema/,
  /^issuanceDate/,
];

export const shouldSkipAttribute = (attributeName) => attributesToSkip.some((regex) => regex.test(attributeName));

function correctFieldPath(path) {
  return path.replace('$.', '');
}

function getAttributeName({ field, selectedCredentials, index }) {
  let attributeName;
  if (Array.isArray(field.path) && field.path.length > 1) {
    const selectedCredential = selectedCredentials[index];
    if (!selectedCredential) {
      return undefined;
    }

    for (let i = 0; i < field.path.length; i += 1) {
      const path = field.path[i];
      const paths = JSONPath.paths(selectedCredential, path);
      if (paths.length) {
        attributeName = correctFieldPath(JSONPath.stringify(paths[0]));
        break;
      }
    }
  } else {
    attributeName = correctFieldPath(Array.isArray(field.path) ? field.path[0] : field.path);
  }

  return attributeName;
}

export function getPexRequiredAttributes(pexRequest, selectedCredentials = []) {
  const presentationDefinition = ensurePresentationDefinition(pexRequest);
  const descriptors = presentationDefinition.input_descriptors || [];
  return descriptors
    .map((inputDescriptor, index) => {
      if (!inputDescriptor?.constraints?.fields?.length) {
        return [];
      }

      return inputDescriptor.constraints.fields
        .filter((field) => {
          if (field.filter || field.optional) {
            return false;
          }

          try {
            const credential = selectedCredentials[index];
            if (!credential) {
              return false;
            }

            const paths = Array.isArray(field.path)
              ? field.path.flatMap((singlePath) => JSONPath.paths(credential, singlePath))
              : JSONPath.paths(credential, field.path);
            return paths.length !== 0;
          } catch (error) {
            console.error(`Error in field ${field.path}: ${error.message}`);
            return false;
          }
        })
        .map((field) => getAttributeName({ field, selectedCredentials, index }))
        .filter((attributeName) => attributeName && !shouldSkipAttribute(attributeName));
    });
}

const PEX_SUBMISSION_CONTEXT = {
  '@version': 1.1,
  presentation_submission: {
    '@id': 'https://identity.foundation/presentation-exchange/#presentation-submission',
    '@type': '@json',
  },
};

/**
 * Generates a (potentially selective-disclosure) presentation that satisfies a Presentation Exchange definition.
 *
 * @param {object} params - Options for presentation derivation.
 * @param {Array<object|string>} params.credentials - The verifiable credentials (JSON objects or serialized JSON strings) to evaluate.
 * @param {object} params.pexRequest - Presentation Definition or a wrapper that contains one (`presentationDefinition` or `presentation_definition`).
 * @param {object} [params.holderKeyDoc] - Holder key material used to sign the presentation when `skipSigning` is false.
 * @param {string} [params.holderDid] - DID that should be set as the presentation holder (falls back to `holderKeyDoc.controller`).
 * @param {Array<string>} [params.holderDids] - Explicit holder DID list passed through to PEX selection.
 * @param {string} [params.challenge] - Challenge used when signing or verifying derived presentations.
 * @param {string} [params.domain] - Domain used when signing selective disclosure presentations.
 * @param {string} [params.presentationId] - Optional identifier for the generated presentation.
 * @param {PresentationSubmissionLocation} [params.presentationSubmissionLocation=PresentationSubmissionLocation.PRESENTATION] - Location for the presentation submission descriptor.
 * @param {object} [params.resolver] - DID resolver used by the Presentation builder and range-proof witness lookups.
 * @param {boolean} [params.compactProof=true] - Whether holder signatures should omit canonical proof fields.
 * @param {Array<string>} [params.limitDisclosureSignatureSuites=DEFAULT_LIMIT_DISCLOSURE_SUITES] - Signature suites that are considered selective-disclosure capable by PEX.
 * @param {Array<string>} [params.restrictToFormats] - Optional PEX filter restricting acceptable VC proof formats.
 * @param {Array<string>} [params.restrictToDIDMethods] - Optional PEX filter restricting acceptable DID methods.
 * @param {boolean} [params.skipSigning=false] - When true, the generated presentation is returned unsigned (useful for SD proofs or tests).
 * @param {Function} [params.loadProvingKey] - Async loader invoked with `{ credentialIndex, presentationDefinition }` and returning `{ provingKey, provingKeyId }` for bound proofs.
 * @param {object} [params.selectiveDisclosure] - Configuration for attribute revelation (global `attributes`), per-credential configs (`credentials[index]`), accumulator witnesses, and presentation builder options.
 * @returns {Promise<object>} Result object containing status, presentation (or derived credentials) and any warnings/errors from PEX.
 */
/* eslint-disable-next-line sonarjs/cognitive-complexity */
export async function generatePresentationFromPexRequest({
  credentials = [],
  pexRequest,
  holderKeyDoc,
  holderDid,
  holderDids = [],
  challenge,
  domain,
  presentationId,
  presentationSubmissionLocation = PresentationSubmissionLocation.PRESENTATION,
  resolver,
  compactProof = true,
  limitDisclosureSignatureSuites = DEFAULT_LIMIT_DISCLOSURE_SUITES,
  restrictToFormats,
  restrictToDIDMethods,
  skipSigning = false,
  loadProvingKey,
  selectiveDisclosure,
} = {}) {
  const presentationDefinition = ensurePresentationDefinition(pexRequest);
  const selectResults = filterCredentialsByPexRequest({
    credentials,
    pexRequest: presentationDefinition,
    holderDids,
    holderDid,
    holderKeyDoc,
    limitDisclosureSignatureSuites,
    restrictToFormats,
    restrictToDIDMethods,
  });
  const selectedCredentials = selectResults.verifiableCredential || [];

  if (
    selectResults.areRequiredCredentialsPresent === Status.ERROR
    || selectedCredentials.length === 0
  ) {
    return {
      status: GeneratePresentationStatus.REQUIREMENTS_NOT_MET,
      error: new Error('Provided credentials do not satisfy the presentation definition'),
      details: selectResults,
    };
  }

  const pexRequiredAttributes = getPexRequiredAttributes(
    presentationDefinition,
    selectedCredentials,
  );
  const selectiveDisclosureRequired = requiresSelectiveDisclosure(presentationDefinition);
  const selectiveConfigs = buildSelectiveDisclosureConfigs(
    selectiveDisclosure,
    selectedCredentials.length,
  );

  if (selectiveDisclosureRequired) {
    const missingAttributes = pexRequiredAttributes.some((required, index) => {
      if (!required.length) {
        return false;
      }
      const provided = new Set(selectiveConfigs[index]?.attributes || []);
      return required.some((attribute) => !provided.has(attribute));
    });
    if (missingAttributes) {
      return {
        status: GeneratePresentationStatus.SELECTIVE_DISCLOSURE_REQUIRED,
        error: new Error('Presentation definition requires selective disclosure'),
        details: selectResults,
        selectiveDisclosure: {
          requiredAttributes: pexRequiredAttributes,
        },
      };
    }
  }

  const needsSelectiveDisclosure = selectiveConfigs.some((config, index) => {
    const required = pexRequiredAttributes[index] || [];
    const provided = config?.attributes || [];
    return required.length > 0
      || provided.length > 0
      || config?.witness;
  }) || Boolean(loadProvingKey);

  const boundOptions = {
    loadProvingKey,
    presentationOptions: selectiveDisclosure?.presentationOptions,
  };

  const shouldRunSelectiveFlow = needsSelectiveDisclosure || Boolean(loadProvingKey);

  let updatedCredentials = selectedCredentials;

  if (shouldRunSelectiveFlow) {
    updatedCredentials = await deriveSelectiveDisclosureCredentials({
      selectedCredentials,
      resolver,
      presentationDefinition,
      pexRequiredAttributes,
      selectiveConfigs,
      boundOptions,
    });
  }

  if (!skipSigning && !holderKeyDoc) {
    throw new Error('holderKeyDoc is required when skipSigning is false');
  }

  if (!skipSigning && !challenge) {
    throw new Error('challenge is required when skipSigning is false');
  }

  const presentationSubmission = pex.presentationSubmissionFrom(
    presentationDefinition,
    updatedCredentials,
    {
      presentationSubmissionLocation,
    },
  );

  const vpId = presentationId || `urn:uuid:${uuidv4()}`;
  const vp = new VerifiablePresentation(vpId);
  updatedCredentials.forEach((credential) => {
    vp.addCredential(credential);
  });
  const normalizedHolder = holderDid || holderKeyDoc?.controller;
  if (normalizedHolder) {
    vp.setHolder(normalizedHolder);
  }
  if (presentationSubmissionLocation === PresentationSubmissionLocation.PRESENTATION) {
    vp.addContext(PEX_SUBMISSION_CONTEXT);
    vp.presentation_submission = presentationSubmission;
  }

  if (skipSigning) {
    return {
      status: GeneratePresentationStatus.SUCCESS,
      presentation: vp.toJSON(),
      presentationSubmission,
      warnings: selectResults.warnings || [],
      matches: selectResults.matches || [],
    };
  }

  const signedPresentation = await vp.sign(
    holderKeyDoc,
    challenge,
    domain,
    resolver,
    compactProof,
  );

  return {
    status: GeneratePresentationStatus.SUCCESS,
    presentation: signedPresentation.toJSON(),
    presentationSubmission,
    warnings: selectResults.warnings || [],
    matches: selectResults.matches || [],
  };
}

/* eslint-disable-next-line sonarjs/cognitive-complexity */
async function deriveSelectiveDisclosureCredentials({
  selectedCredentials,
  resolver,
  presentationDefinition,
  pexRequiredAttributes,
  selectiveConfigs,
  boundOptions = {},
}) {
  const globalBoundsEnabled = Boolean(boundOptions.loadProvingKey);
  const derivationPlan = selectedCredentials.map((credential, index) => {
    const config = selectiveConfigs[index] || {};
    const requiredAttributes = pexRequiredAttributes[index] || [];
    const customAttributes = config.attributes || [];
    const attributesToReveal = dedupeAttributes([
      ...customAttributes,
      ...requiredAttributes,
    ]);
    const shouldDerive = globalBoundsEnabled
      || attributesToReveal.length > 0
      || !!config.witness;
    return {
      credential,
      attributesToReveal,
      witness: config.witness,
      shouldDerive,
    };
  });

  if (!derivationPlan.some((item) => item.shouldDerive)) {
    return selectedCredentials;
  }

  derivationPlan.forEach((plan, index) => {
    if (plan.shouldDerive && !isSelectiveDisclosureCredential(plan.credential)) {
      throw new Error(`Selective disclosure is not supported for credential at index ${index}`);
    }
  });

  const presentation = new Presentation();
  const sourceToBuilderMap = [];

  for (let index = 0; index < derivationPlan.length; index += 1) {
    const plan = derivationPlan[index];
    if (plan.shouldDerive) {
      const { credential } = plan;
      const clonedCredential = typeof credential === 'string'
        ? JSON.parse(credential)
        : JSON.parse(JSON.stringify(credential));
      // eslint-disable-next-line no-await-in-loop
      const builderIndex = await presentation.addCredentialToPresent(clonedCredential, {
        resolver,
      });
      sourceToBuilderMap.push({ sourceIndex: index, builderIndex });
    }
  }

  const descriptorBoundsMap = {};

  for (const { sourceIndex, builderIndex } of sourceToBuilderMap) {
    const plan = derivationPlan[sourceIndex];
    if (globalBoundsEnabled) {
      // eslint-disable-next-line no-await-in-loop
      const proofConfig = await resolveProvingKeyConfig({
        loadProvingKey: boundOptions.loadProvingKey,
        credentialIndex: sourceIndex,
        presentationDefinition,
      });
      if (proofConfig?.provingKey) {
        const scopedBounds = applyEnforceBounds({
          builder: presentation.presBuilder,
          presentationDefinition,
          provingKeyId: proofConfig.provingKeyId || 'key0',
          provingKey: proofConfig.provingKey,
          selectedCredentials: [plan.credential],
          credentialIdx: builderIndex,
        });
        if (scopedBounds[builderIndex]) {
          descriptorBoundsMap[sourceIndex] = scopedBounds[builderIndex];
        }
      }
    }
    const boundsForCredential = descriptorBoundsMap[sourceIndex] || [];
    const boundAttributes = boundsForCredential.map((bound) => bound.attributeName);
    const filteredAttributes = (plan.attributesToReveal || []).filter(
      (attribute) => attribute
        && !boundAttributes.includes(attribute)
        && !shouldSkipAttribute(attribute),
    );
    const requiredAttributes = pexRequiredAttributes[sourceIndex] || [];
    requiredAttributes.forEach((attribute) => {
      if (attribute && !filteredAttributes.includes(attribute)) {
        filteredAttributes.push(attribute);
      }
    });

    if (filteredAttributes.length) {
      presentation.addAttributeToReveal(builderIndex, filteredAttributes);
    }
    if (plan.witness) {
      const {
        membershipWitness,
        accumulated,
        pk,
        params,
      } = plan.witness;
      presentation.presBuilder.addAccumInfoForCredStatus(
        builderIndex,
        membershipWitness,
        accumulated,
        pk,
        params,
      );
    }
  }

  const derivedCredentials = await presentation.deriveCredentials(
    boundOptions.presentationOptions,
  );

  const updatedCredentials = [...selectedCredentials];
  let derivedIndex = 0;
  sourceToBuilderMap.forEach(({ sourceIndex }) => {
    updatedCredentials[sourceIndex] = derivedCredentials[derivedIndex];
    derivedIndex += 1;
  });

  return updatedCredentials;
}

async function resolveProvingKeyConfig({
  loadProvingKey,
  credentialIndex,
  presentationDefinition,
}) {
  if (typeof loadProvingKey !== 'function') {
    return null;
  }
  const loaded = await loadProvingKey({
    credentialIndex,
    presentationDefinition,
  });
  if (!loaded?.provingKey) {
    return null;
  }
  return {
    provingKey: loaded.provingKey,
    provingKeyId: loaded.provingKeyId || 'key0',
  };
}
