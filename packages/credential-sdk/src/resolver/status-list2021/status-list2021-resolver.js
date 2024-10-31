import { ensureInstanceOf } from "../../utils";
import AbstractStatusListCredentialModule from "../../modules/abstract/status-list-credential/module";
import {
  HEX_ID_REG_EXP_PATTERN,
  METHOD_REG_EXP_PATTERN,
  Resolver,
} from "../generic";

const STATUS_LIST_ID_MATCHER = new RegExp(
  `^status-list2021:${METHOD_REG_EXP_PATTERN}:${HEX_ID_REG_EXP_PATTERN}$`
);

class StatusListResolver extends Resolver {
  prefix = "status-list2021";

  get method() {
    return this.statusListCredentialModule.methods();
  }

  /**
   * @param {AbstractStatusListCredentialModule} statusListCredentialModule
   * @constructor
   */
  constructor(statusListCredentialModule) {
    super();

    /**
     * @type {AbstractStatusListCredentialModule}
     */
    this.statusListCredentialModule = ensureInstanceOf(
      statusListCredentialModule,
      AbstractStatusListCredentialModule
    );
  }

  async resolve(statusListId) {
    const match = statusListId.match(STATUS_LIST_ID_MATCHER);
    if (!match) {
      throw new Error(
        `Invalid \`StatusList2021Credential\` id: \`${statusListId}\``
      );
    }
    const [, _, id] = statusListId.match(STATUS_LIST_ID_MATCHER);

    const cred = await this.statusListCredentialModule.getStatusListCredential(
      id
    );

    return cred?.value.list.toJSON();
  }
}

/**
 * Resolves `StatusList2021Credential`s with identifier `status-list2021:dock:*`.
 * @type {StatusListResolver}
 */
export default StatusListResolver;
