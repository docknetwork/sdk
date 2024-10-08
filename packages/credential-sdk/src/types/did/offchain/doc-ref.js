import { TypedEnum, TypedBytes } from '../../generic';

/**
 * An off-chain DID Doc reference stored on-chain. The reference may be
 *  - a CID, https://docs.ipfs.io/concepts/content-addressing/#identifier-formats
 *  - a URL
 *  - any other format
 */
export class OffChainDidDocRef extends TypedEnum {}

class DocValue extends TypedBytes {}

export class CIDOffchainDocRef extends OffChainDidDocRef {
  static Type = 'cid';

  static Class = DocValue;
}
export class URLOffchainDocRef extends OffChainDidDocRef {
  static Type = 'url';

  static Class = DocValue;
}
export class CustomOffchainDocRef extends OffChainDidDocRef {
  static Type = 'custom';

  static Class = DocValue;
}

OffChainDidDocRef.bindVariants(
  CIDOffchainDocRef,
  URLOffchainDocRef,
  CustomOffchainDocRef,
);
