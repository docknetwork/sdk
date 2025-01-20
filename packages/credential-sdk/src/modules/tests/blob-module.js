import { DidKeypair, Ed25519Keypair } from "../../keypairs";
import { NoBlobError } from "../abstract/blob/errors";
import { DIDDocument } from "../../types";
import { testIf } from "./common";
import { BlobResolver } from "../../resolver/blob";
import { stringToU8a } from "../../utils";

// eslint-disable-next-line jest/no-export
export default function generateBlobModuleTests(
  { did: didModule, blob: blobModule },
  { Did, BlobId },
  filter = () => true
) {
  const test = testIf(filter);

  describe(`Using ${didModule.constructor.name} and ${blobModule.constructor.name}`, () => {
    test("Generates a `DIDDocument` and creates a `Blob` owned by this DID", async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      const blob1 = {
        id: BlobId.random(did),
        blob: "abcdef",
      };

      await blobModule.new(blob1, didKeypair);

      const written1 = await blobModule.get(blob1.id);

      expect(written1[0].eq(did)).toBe(true);
      expect(written1[1].toUTF8String()).toEqual(blob1.blob);

      const blob2 = {
        id: BlobId.random(did),
        blob: {
          example: "content",
        },
      };
      await blobModule.new(blob2, didKeypair);

      const written2 = await blobModule.get(blob2.id);
      expect(written2[0].eq(did)).toBe(true);
      expect(written2[1].toObject()).toEqual(blob2.blob);

      await expect(() => blobModule.new(blob2, didKeypair)).rejects.toThrow();
    });

    test("Throws an error on missing `Blob`", async () => {
      const id = BlobId.random(Did.random());

      await expect(() => blobModule.get(id)).rejects.toThrow(
        new NoBlobError(id)
      );
    });

    test("`BlobResolver`", async () => {
      const resolver = new BlobResolver(blobModule);
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      const blob1 = {
        id: BlobId.random(did),
        blob: "abcdef",
      };

      await blobModule.new(blob1, didKeypair);
      expect(await resolver.resolve(String(blob1.id))).toEqual([
        String(did),
        stringToU8a(blob1.blob),
      ]);
    });
  });
}
