import * as path from 'path';
import * as r1csf from 'r1csfile';
import * as fs from 'fs';
/**
 * Given messages and indices to reveal, returns 2 maps, one for revealed messages and one for unrevealed
 * @param messages
 * @param revealedIndices
 * @returns [Map<number, Uint8Array>, Map<number, Uint8Array>]
 */
// eslint-disable-next-line import/prefer-default-export
export function getRevealedUnrevealed(messages, revealedIndices) {
  const revealedMsgs = new Map();
  const unrevealedMsgs = new Map();
  for (let i = 0; i < messages.length; i++) {
    if (revealedIndices.has(i)) {
      revealedMsgs.set(i, messages[i]);
    } else {
      unrevealedMsgs.set(i, messages[i]);
    }
  }

  return [revealedMsgs, unrevealedMsgs];
}

export function circomArtifactPath(fileName) {
  return `${path.resolve('./')}/tests/integration/anoncreds/circom/${fileName}`;
}

export function getWasmBytes(fileName) {
  const content = fs.readFileSync(circomArtifactPath(fileName));
  return new Uint8Array(content);
}

export async function parseR1CSFile(r1csName) {
  const parsed = await r1csf.readR1cs(circomArtifactPath(r1csName));
  await parsed.curve.terminate();
  return parsed;
}
