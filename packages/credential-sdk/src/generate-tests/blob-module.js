import { DidKeypair, Ed25519Keypair } from '../keypairs';
import { NoBlobError } from '../modules/blob/errors';
import { DIDDocument } from '../types';

// eslint-disable-next-line jest/no-export
export default function generateBlobModuleTests(
  { did: didModule, blob: blobModule },
  { DID, BlobId },
) {
  it('Generates a `DIDDocument` and creates a blob owned by this DID', async () => {
    const did = DID.random();

    const keyPair = Ed25519Keypair.random();
    const didKeypair = new DidKeypair([did, 1], keyPair);

    const document = DIDDocument.create(did, [didKeypair.didKey()]);

    await didModule.createDocument(document, didKeypair);

    const blob1 = {
      id: BlobId.random(did),
      blob: 'abcdef',
    };
    await blobModule.new(blob1, did, didKeypair);

    const written1 = await blobModule.get(blob1.id);

    expect(written1[0].eq(did)).toBe(true);
    expect(written1[1].toUTF8String()).toEqual(blob1.blob);

    const blob2 = {
      id: BlobId.random(did),
      blob: {
        example: 'content',
      },
    };
    await blobModule.new(blob2, did, didKeypair);

    const written2 = await blobModule.get(blob2.id);
    expect(written2[0].eq(did)).toBe(true);
    expect(written2[1].toObject()).toEqual(blob2.blob);

    await expect(() => blobModule.new(blob2, did, didKeypair)).rejects.toThrow();
  });

  it('Throws an error on missing blob', async () => {
    const id = BlobId.random(DID.random());

    await expect(() => blobModule.get(id)).rejects.toThrow(new NoBlobError(id));
  });
}
