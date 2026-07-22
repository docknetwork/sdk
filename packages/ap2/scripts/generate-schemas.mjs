#!/usr/bin/env node
/**
 * Regenerates this package's mandate JSON Schemas
 * (src/schemas/{checkout,payment}-mandate-{open,closed}.json) from the vendored
 * upstream AP2 mirror in ./upstream-ap2-schemas.
 *
 * Source of truth: https://github.com/google-agentic-commerce/AP2/tree/v0.2.0/code/sdk/schemas/ap2
 * (mirrored, unmodified, in ./upstream-ap2-schemas - re-vendor from a newer tag and
 * re-run this script when upstream AP2 changes; this repo owns no schema content of
 * its own beyond that mirror).
 *
 * The only transform applied is inlining AP2's cross-file "types/*.json" refs
 * (Merchant, Amount, PaymentInstrument, PISP) into local, same-document $defs, so
 * each output file is a self-contained JSON Schema document that ajv can compile
 * standalone (matching the $defs shape these schemas already use for their own
 * inline constraint types). This is a general "make it portable" step, not a
 * Truvera-specific one - schema-hosting/consumer-specific transforms (e.g.
 * Truvera's own backfilled `type` siblings and empty `properties: {}` placeholders)
 * are intentionally NOT applied here; those stay in whichever downstream consumer
 * needs them.
 *
 * Usage:
 *   node scripts/generate-schemas.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPSTREAM_DIR = path.join(__dirname, '..', 'upstream-ap2-schemas');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'schemas');

// AP2 "types/*.json" refs to object-shaped types: fully inlined (type+properties+
// required), no $ref left behind, so the output schema is self-contained.
const OBJECT_TYPE_REFS = {
  'types/amount.json': 'amount',
  'types/merchant.json': 'merchant',
  'types/payment_instrument.json': 'payment_instrument',
  'types/pisp.json': 'pisp',
};

// Upstream file name -> output file name. Only the four mandate schemas this
// package uses; upstream's receipt schemas aren't part of this generator.
const SCHEMA_FILES = {
  'open_checkout_mandate.json': 'checkout-mandate-open.json',
  'checkout_mandate.json': 'checkout-mandate-closed.json',
  'open_payment_mandate.json': 'payment-mandate-open.json',
  'payment_mandate.json': 'payment-mandate-closed.json',
};

function readJSON(dir, relPath) {
  return JSON.parse(readFileSync(path.join(dir, relPath), 'utf8'));
}

function loadTypeDef(ref) {
  const body = readJSON(UPSTREAM_DIR, ref);
  delete body.$schema;
  delete body.$id;
  return body;
}

// Walks the schema, replacing any $ref to a known object-type file with its type/
// properties/required inlined directly - the referencing node keeps its own
// `description` if it had one.
function inlineObjectRefs(node) {
  if (Array.isArray(node)) {
    node.forEach(inlineObjectRefs);
    return;
  }
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string' && OBJECT_TYPE_REFS[node.$ref]) {
      const typeBody = loadTypeDef(node.$ref);
      delete node.$ref;
      node.type = typeBody.type;
      node.properties = typeBody.properties;
      node.required = typeBody.required;
      if (!node.description && typeBody.description) node.description = typeBody.description;
    }
    Object.values(node).forEach(inlineObjectRefs);
  }
}

function generate(upstreamFileName, outputFileName) {
  const schema = readJSON(UPSTREAM_DIR, upstreamFileName);
  schema.$schema = 'http://json-schema.org/draft-07/schema#';
  delete schema.$id;

  inlineObjectRefs(schema);

  const outPath = path.join(OUTPUT_DIR, outputFileName);
  writeFileSync(outPath, `${JSON.stringify(schema, null, 2)}\n`);
  console.log(`Generated ${outPath}`);
}

for (const [upstreamFileName, outputFileName] of Object.entries(SCHEMA_FILES)) {
  generate(upstreamFileName, outputFileName);
}
