/*
eslint prefer-destructuring: "off"
*/
// Parse method taken from: https://github.com/decentralized-identity/did-resolver/blob/1.1.0/src/resolver.ts
// Copyright 2018 ConsenSys AG

// Licensed under the Apache License, Version 2.0(the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const ID_CHAR = '[a-zA-Z0-9_.-]';
const METHOD = '([a-zA-Z0-9_]+)';
const METHOD_ID = `(${ID_CHAR}+(:${ID_CHAR}+)*)`;
const PARAM_CHAR = '[a-zA-Z0-9_.:%-]';
const PARAM = `;${PARAM_CHAR}+=${PARAM_CHAR}*`;
const PARAMS = `((${PARAM})*)`;
// eslint-disable-next-line no-useless-escape
const PATH = '(\/[^#?]*)?';
const QUERY = '([?][^#]*)?';
// eslint-disable-next-line no-useless-escape
const FRAGMENT = '(\#.*)?';
const DID_MATCHER = new RegExp(
  `^did:${METHOD}:${METHOD_ID}${PARAMS}${PATH}${QUERY}${FRAGMENT}$`,
);

function parse(didUrl) {
  if (didUrl === '' || !didUrl) throw new Error('Missing DID');
  const sections = didUrl.match(DID_MATCHER);
  if (sections) {
    const parts = {
      did: `did:${sections[1]}:${sections[2]}`,
      method: sections[1],
      id: sections[2],
      didUrl,
    };
    if (sections[4]) {
      const params = sections[4].slice(1).split(';');
      parts.params = {};
      for (const p of params) {
        const kv = p.split('=');
        parts.params[kv[0]] = kv[1];
      }
    }
    if (sections[6]) parts.path = sections[6];
    if (sections[7]) parts.query = sections[7].slice(1);
    if (sections[8]) parts.fragment = sections[8].slice(1);
    return parts;
  }
  throw new Error(`Invalid DID ${didUrl}`);
}

/**
 * A DID resolver
 */
export default class DIDResolver {
  parseDid(did) {
    return parse(did);
  }

  /**
   * Resolve a Dock DID. The DID is expected to be a fully qualified DID.
   * @param {string} did - The full DID
   * @returns {Promise<object>}
   */
  async resolve(did) {
    throw new Error(`Resolving not implemented in base class, please extend. ${this.constructor.name} ${did}`);
  }
}
