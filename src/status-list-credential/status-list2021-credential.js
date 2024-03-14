import {
  decodeList,
  createList,
  createCredential,
  StatusList, // eslint-disable-line
} from '@digitalcredentials/vc-status-list';
import { u8aToHex, u8aToU8a } from '@polkadot/util';
import { gzip, ungzip } from 'pako';
import { DockStatusList2021Qualifier } from '../utils/vc/constants';
import VerifiableCredential from '../verifiable-credential';
import { ensureStatusListId } from '../utils/type-helpers';
import { KeyDoc } from "../utils/vc/helpers"; // eslint-disable-line

/**
 * Status list 2021 verifiable credential as per https://www.w3.org/TR/vc-status-list/#statuslist2021credential.
 */
export default class StatusList2021Credential extends VerifiableCredential {
  /**
   * Create a new Status List 2021 Verifiable Credential instance.
   * @param {string} id - id of the credential
   */
  constructor(id) {
    super(id);

    // Caches decoded status list.
    Object.defineProperty(this, 'internalCachedStatusList', {
      value: { encoded: void 0, decoded: void 0 },
      writable: true,
    });
  }

  /**
   * Fail if the given verifiable credential id isn't a valid `StatusList2021Credential` id.
   * @param {*} id
   */
  static verifyID(id) {
    ensureStatusListId(id);
  }

  /**
   * Creates new `StatusList2021Credential` with supplied `id` and option `statusPurpose` = `revocation` by default,
   * `length` and `revokeIndices`. Note that credential with `statusPurpose` = `revocation` can't unsuspend its indices.
   * To allow unrevoking indices in the future, use `statusPurpose` = `suspension`.
   * The proof will be generated immediately using supplied `keyDoc`.
   *
   * @param {KeyDoc} keyDoc
   * @param {string} id - on-chain hex identifier for the `StatusList2021Credential`.
   * @param {object} [params={}]
   * @param {'revocation'|'suspension'} [params.statusPurpose=revocation] - `statusPurpose` of the `StatusList2021Credential`.
   * Can be either `revocation` or `suspension`.
   * @param {number} [params.length=1e4] - length of the underlying `StatusList`.
   * @param {Iterable<number>} [params.revokeIndices=[]] - iterable producing indices to be revoked or suspended initially
   * @returns {Promise<StatusList2021Credential>}
   */
  static async create(
    keyDoc,
    id,
    { statusPurpose = 'revocation', length = 1e4, revokeIndices = [] } = {},
    api,
  ) {
    const statusList = await createList({ length });
    if (api.specVersion < 54) {
      statusList.bitstring.leftToRightIndexing = false;
    }
    this.updateStatusList(statusPurpose, statusList, revokeIndices);

    const jsonCred = await createCredential({
      id: `${this.qualifier}${id}`,
      list: statusList,
      statusPurpose,
    });

    const cred = this.fromJSON(jsonCred, api);

    return await cred.sign(keyDoc);
  }

  /**
   * Revokes indices and unsuspends other indices in the underlying status list, regenerating the proof.
   * If `statusPurpose` = `revocation`, indices can't be unsuspended.
   * The status list revoked (suspended)/unsuspended indices will be set atomically and in case of an error,
   * the underlying value won't be modified.
   * Throws an error if the underlying status list can't be decoded or any of the supplied indices is out of range.
   *
   * @param {KeyDoc} keyDoc
   * @param {object} [update={}]
   * @param {Iterable<number>} update.revokeIndices - indices to be revoked or suspended
   * @param {Iterable<number>} update.unsuspendIndices - indices to be unsuspended
   * @returns {Promise<this>}
   */
  async update(keyDoc, { revokeIndices = [], unsuspendIndices = [] }) {
    const currentStatusList = await this.decodeStatusList();
    const statusList = new StatusList({
      buffer: new Uint8Array((currentStatusList).bitstring.bits),
    });
    if (this.bigEndianEncoding) {
      statusList.bitstring.leftToRightIndexing = false;
    }

    this.constructor.updateStatusList(
      this.credentialSubject.statusPurpose,
      statusList,
      revokeIndices,
      unsuspendIndices,
    );

    this.credentialSubject.encodedList = await statusList.encode();
    // Remove `proof` so that an array of `proof`s is not created by the following `sign` call.
    delete this.proof;
    this.setIssuanceDate(new Date().toISOString());

    await this.sign(keyDoc);

    return this;
  }

  /**
   * Returns a `Promise` resolving to the decoded `StatusList`.
   *
   * @returns {Promise<StatusList>}
   */
  async decodeStatusList() {
    const { encoded, decoded } = this.internalCachedStatusList;

    if (
      encoded === this.credentialSubject.encodedList
      && decoded !== void 0
    ) {
      return decoded;
    } else {
      this.internalCachedStatusList = {
        encoded: this.credentialSubject.encodedList,
        decoded: decodeList(this.credentialSubject).then((list) => {
          if (this.bigEndianEncoding) {
            // eslint-disable-next-line
            list.bitstring.leftToRightIndexing = false;
          }

          return list;
        }),
      };

      return this.internalCachedStatusList.decoded;
    }
  }

  /**
   * Returns `true` if given index is revoked or suspended, `false` otherwise.
   * Throws an error if the underlying status list can't be decoded or supplied index is out of range.
   *
   * @param {number} index
   * @returns {Promise<boolean>}
   */
  async revoked(index) {
    const decodeStatusList = await this.decodeStatusList();

    return decodeStatusList.getStatus(index);
  }

  /**
   * Accepts an iterable of indices to be checked and returns an array containing `true` in the positions
   * of revoked (suspended) indices and `false` for non-revoked (non-suspended) indices.
   * Throws an error if the underlying status list can't be decoded or any of supplied indices is out of range.
   *
   * @param {Iterable<number>} indices
   * @returns {Promise<Array<boolean>>}
   */
  async revokedBatch(indices) {
    const decodeStatusList = await this.decodeStatusList();

    return [...indices].map((index) => decodeStatusList.getStatus(index));
  }

  /**
   * Decodes `StatusList2021Credential` from provided bytes.
   * @param {Uint8Array} bytes
   */
  static fromBytes(bytes, api) {
    const gzipBufferCred = Buffer.from(u8aToU8a(bytes));
    const stringifiedCred = ungzip(gzipBufferCred, { to: 'string' });
    const parsedCred = JSON.parse(stringifiedCred);

    return this.fromJSON(parsedCred, api);
  }

  /**
   * Instantiates `StatusList2021Credential` from the provided `JSON`.
   *
   * @param {object} json
   * @returns {StatusList2021Credential}
   */
  static fromJSON(json, api) {
    const cred = super.fromJSON(json);
    cred.validate();
    if (api.specVersion < 54) {
      Object.defineProperty(cred, 'bigEndianEncoding', { value: true });
    }

    return cred;
  }

  /**
   * Converts `StatusList2021Credential` to its JSON representation.
   * @returns {object}
   */
  toJSON() {
    this.validate();

    return super.toJSON();
  }

  /**
   * Encodes `StatusList2021Credential` as bytes.
   * @returns {Uint8Array}
   */
  toBytes() {
    const jsonCred = this.toJSON();
    const stringifiedCred = JSON.stringify(jsonCred);
    const bufferCred = Buffer.from(stringifiedCred);

    return gzip(bufferCred);
  }

  /**
   * Converts given credentials to the substrate-compatible representation.
   *
   * @returns {{ StatusList2021Credential: string }}
   */
  toSubstrate() {
    return { StatusList2021Credential: u8aToHex(this.toBytes()) };
  }

  /**
   * Validates underlying `StatusList2021Credential`.
   */
  validate() {
    const { credentialSubject } = this;

    if (!credentialSubject) throw new Error('Missing `credentialSubject`');
    if (!this.constructor.statusPurposes.has(credentialSubject.statusPurpose)) {
      throw new Error(
        `Invalid \`statusPurpose\`, expected one of \`${[
          ...this.constructor.statusPurposes,
        ].join(', ')}\``,
      );
    }
    if (typeof credentialSubject.id !== 'string' || !credentialSubject.id) {
      throw new Error('Missing `credentialSubject.id`');
    }
    if (credentialSubject.type !== 'StatusList2021') {
      throw new Error(
        '`credentialSubject.type` must be set to `StatusList2021`',
      );
    }
    if (!credentialSubject.encodedList) {
      throw new Error('`credentialSubject.encodedList` must be present');
    }
  }

  /**
   * Revokes (suspends) `revokeIndices` and unsuspends `unsuspendIndices` from the supplied `StatusList`.
   *
   * Throws an error if
   * - non-empty `unsuspendIndices` passed along with `statusPurpose != suspension`
   * - any index is present in both iterables
   * - some index is out of bounds.
   *
   * @param {'revocation'|'suspension'} statusPurpose
   * @param {StatusList} statusList
   * @param {Iterable<number>} revokeIndices
   * @param {Iterable<number>} unsuspendIndices
   */
  static updateStatusList(
    statusPurpose,
    statusList,
    revokeIndices = [],
    unsuspendIndices = [],
  ) {
    const unsuspendIndiceSet = new Set(unsuspendIndices);
    if (statusPurpose !== 'suspension' && unsuspendIndiceSet.size > 0) {
      throw new Error(
        `Can't unsuspend indices for credential with \`statusPurpose\` = \`${statusPurpose}\`, it's only possible with \`statusPurpose\` = \`suspension\``,
      );
    }

    for (const idx of revokeIndices) {
      if (unsuspendIndiceSet.has(idx)) {
        throw new Error(
          `Index \`${idx}\` appears in both revoke and unsuspend sets`,
        );
      }

      statusList.setStatus(idx, true);
    }
    for (const idx of unsuspendIndiceSet) {
      statusList.setStatus(idx, false);
    }
  }
}

/**
 * Allowed status purposes for this credential type.
 */
StatusList2021Credential.statusPurposes = new Set(['revocation', 'suspension']);
StatusList2021Credential.qualifier = DockStatusList2021Qualifier;
