import {
  decodeList,
  createList,
  createCredential,
} from '@digitalbazaar/vc-status-list';
import { u8aToHex } from '@polkadot/util';
import { DockStatusList2021Qualifier } from '../utils/vc/constants';
import VerifiableCredential from '../verifiable-credential';
import { ensureStatusListId } from '../utils/type-helpers';

export default class StatusList2021Credential extends VerifiableCredential {
  /**
   * Create a new Verifiable Credential instance.
   * @param {string} id - id of the credential
   */
  constructor(id) {
    super(id);
    this.validate();

    let encodedStatusList; let
      cachedStatusList;
    Object.defineProperty(this, 'decodedStatusList', {
      enumerable: false,
      value: async function decodedStatusList() {
        if (
          encodedStatusList === this.credentialSubject.encodedList
          && cachedStatusList !== void 0
        ) {
          return cachedStatusList;
        } else {
          cachedStatusList = await decodeList(this.credentialSubject);
          encodedStatusList = this.credentialSubject.encodedList;

          return cachedStatusList;
        }
      },
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
   * Creates new `StatusList2021Credential` using supplied `keyDoc`, `id`, `params`.
   *
   * @param {*} keyDoc
   * @param {string} id - on-chain hex identifier for the `StatusList2021Credential`.
   * @param {object} [params={}]
   * @param {string} params.statusPurpose - `statusPurpose` of the `StatusList2021Credential`.
   * Can be either `revocation`, `suspension`.
   *
   * @param {number} params.length - length of the underlying `StatusList`.
   * @param {Iterable<number>} params.revokeIndices - iterable producing indices to be revoked initially
   */
  static async create(
    keyDoc,
    id,
    { statusPurpose = 'revocation', length = 1e4, revokeIndices = [] } = {},
  ) {
    const statusList = await createList({ length });
    this.updateStatusList(statusList, revokeIndices);

    const jsonCred = await createCredential({
      id: `${DockStatusList2021Qualifier}${id}`,
      list: statusList,
      statusPurpose,
    });
    const cred = this.fromJSON(jsonCred);

    return cred.sign(keyDoc);
  }

  /**
   *
   * @param {*} keyDoc
   * @param {object} update
   * @param {Iterable<number>} update.revokeIndices
   * @param {Iterable<number>} update.unrevokeIndices
   * @returns {this}
   */
  async update(keyDoc, { revokeIndices = [], unrevokeIndices = [] }) {
    if (
      this.credentialSubject.statusPurpose === 'revocation'
      && [...unrevokeIndices].length > 0
    ) {
      throw new Error(
        "Can't unrevoke indices for credential with `statusPurpose` = `revocation`, it's only possible with `statusPurpose` = `suspension`",
      );
    }

    const statusList = await this.decodedStatusList();

    this.constructor.updateStatusList(
      statusList,
      revokeIndices,
      unrevokeIndices,
    );

    this.credentialSubject.encodedList = await statusList.encode();
    this.setProof(null);
    this.setIssuanceDate(new Date().toISOString());

    await this.sign(keyDoc);

    return this;
  }

  /**
   * Returns `true` if given index is revoked, `false` otherwise.
   * Throws an error if the underlying status list can't be decoded or supplied index is out of range.
   *
   * @param {number} index
   * @returns {boolean}
   */
  async revoked(index) {
    const decodedStatusList = await this.decodedStatusList();

    return decodedStatusList.getStatus(index);
  }

  /**
   * Accepts an iterable of indices to be checked and returns an array containing `true` in the positions
   * of revoked indices and `false` for non-revoked indices.
   * Throws an error if the underlying status list can't be decoded or any of supplied indices is out of range.
   *
   * @param {Iterable<number>} indices
   * @returns {Array<boolean>}
   */
  async revokedBatch(indices) {
    const decodedStatusList = await this.decodedStatusList();

    return [...indices].map((index) => decodedStatusList.getStatus(index));
  }

  /**
   * Decodes `StatusList2021Credential` from provided bytes.
   * @param {*} bytes
   */
  static fromBytes(bytes) {
    const bufferCred = Buffer.from(bytes);
    const stringifiedCred = bufferCred.toString('utf-8');
    const parsedCred = JSON.parse(stringifiedCred);

    return this.fromJSON(parsedCred);
  }

  /**
   * Encodes `StatusList2021Credential` as bytes.
   * @returns {Uint8Array}
   */
  toBytes() {
    const stringifiedCred = JSON.stringify(this.toJSON());
    const bufferCred = new Uint8Array(Buffer.from(stringifiedCred, 'utf-8'));
    return u8aToHex(bufferCred);
  }

  /**
   *
   * @returns {{ StatusList2021Credential: Uint8Array }}
   */
  toSubstrate() {
    return { StatusList2021Credential: this.toBytes() };
  }

  /**
   * Validates underlying credentials.
   */
  validate() {
    if (
      this.constructor.statusPurposes.has(this.credentialSubject.statusPurpose)
    ) {
      throw new Error(
        `Invalid \`statusPurpose\`, expected one of \`${[
          ...this.constructor.statusPurposes,
        ].join(', ')}\``,
      );
    }
  }

  /**
   * Revokes `revokeIndices` and unrevokes `unrevokeIndices` from the supplied `StatusList`.
   * Throws an error if any index is present in both iterables or some index is out of bounds.
   *
   * @param {StatusList} statusList
   * @param {Iterable<number>} revokeIndices
   * @param {Iterable<number>} unrevokeIndices
   */
  static updateStatusList(
    statusList,
    revokeIndices = [],
    unrevokeIndices = [],
  ) {
    revokeIndices = new Set(revokeIndices);
    unrevokeIndices = new Set(unrevokeIndices);

    for (const idx of revokeIndices) {
      if (unrevokeIndices.has(idx)) {
        throw new Error(
          `Index \`${idx}\` appears in both revoke and unrevoke sets`,
        );
      }

      statusList.setStatus(idx, true);
    }
    for (const idx of unrevokeIndices) {
      statusList.setStatus(idx, false);
    }
  }
}

/**
 * Allowed status purposes for this credential type.
 */
StatusList2021Credential.statusPurposes = new Set(['revocation', 'suspension']);
