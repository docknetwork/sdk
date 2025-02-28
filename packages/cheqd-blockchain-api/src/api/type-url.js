import { extendNull } from '@docknetwork/credential-sdk/utils';
import { protobufPackage as didProtobufPackage } from '@cheqd/ts-proto/cheqd/did/v2/index.js';
import { protobufPackage as resourceProtobufPackage } from '@cheqd/ts-proto/cheqd/resource/v2/index.js';

export const fullTypeUrl = (typeUrl) => {
  const match = String(typeUrl).match(
    /^\/(?<prefix>[^/]*?(?=\.([^/.]+)$))\.(?<name>[^/.]+)$|^(?<nameOnly>[^/.]+)$/,
  );

  if (match == null) {
    throw new Error(`Invalid typeUrl provided: \`${typeUrl}\``);
  }
  const {
    groups: { prefix, name, nameOnly },
  } = match;

  // eslint-disable-next-line no-use-before-define
  const prefixByName = PrefixesByTypeUrl[nameOnly ?? name];
  if (!prefixByName) {
    throw new Error(
      `Invalid typeUrl name provided: \`${typeUrl}\`, can't find prefix for \`${nameOnly}\``,
    );
  } else if (nameOnly) {
    return `/${prefixByName}.${nameOnly}`;
  } else if (prefix !== prefixByName) {
    throw new Error(`Prefix must be ${prefixByName}, got ${prefix}`);
  } else {
    return `/${prefix}.${name}`;
  }
};

export const fullTypeUrls = (txOrTxs) => [].concat(txOrTxs).map(({ typeUrl }) => fullTypeUrl(typeUrl));

export const buildTypeUrlObject = (
  createDID,
  updateDID,
  deactivateDID,
  createResource,
  f = fullTypeUrl,
) => extendNull({
  [f('MsgCreateDidDoc')]: createDID,
  [f('MsgUpdateDidDoc')]: updateDID,
  [f('MsgDeactivateDidDoc')]: deactivateDID,
  [f('MsgCreateResource')]: createResource,
});

export const PrefixesByTypeUrl = buildTypeUrlObject(
  didProtobufPackage,
  didProtobufPackage,
  didProtobufPackage,
  resourceProtobufPackage,
  (key) => key,
);
