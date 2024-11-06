import { DidKeypair, Ed25519Keypair } from "../../keypairs";
import { NoBlobError } from "../abstract/blob/errors";
import { BBSParamsValue, DIDDocument } from "../../types";
import { itIf } from "./common";
import { BlobResolver } from "../../resolver/blob";
import { stringToU8a } from "../../utils";
import { CheqdParamsId } from "../../types/offchain-signatures/params/id";
import { TypedBytes } from "../../types/generic";

// eslint-disable-next-line jest/no-export
export default function generateBlobModuleTests(
  { did: didModule, offchainSignatures },
  { DID, BlobId },
  filter = () => true
) {
  const test = itIf(filter);

  describe(`Using ${didModule.constructor.name} and ${offchainSignatures.constructor.name}`, () => {
    test("Generates a `DIDDocument` with `OffchainPublicKey` and creates a `OffchainParameters` owned by this DID", async () => {
      const did = DID.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const bbsParamsId = CheqdParamsId.random();
      const bbsPlusParamsId = CheqdParamsId.random();
      const psParamsId = CheqdParamsId.random();

      const bbsParams = new BBSParamsValue(TypedBytes.random(100), "bbs");
      const bbsPlusParams = new BBSParamsValue(TypedBytes.random(100), "bbs+");
      const psParams = new BBSParamsValue(TypedBytes.random(100), "ps");

      await offchainSignatures.addParams(bbsParamsId, bbsParams, did);
      await offchainSignatures.addParams(bbsPlusParamsId, bbsPlusParams, did);
      await offchainSignatures.addParams(psParamsId, psParams, did);

      const bbsKey = new BBSPublicKeyValue(TypedBytes.random(100), bbsParamsId);
      const bbsPlusKey = new BBSPlusPublicKeyValue(TypedBytes.random(100), bbsPlusParamsId);
      const psKey = new PSPublicKeyValue(TypedBytes.random(1000), psParamsId);

      const document = DIDDocument.create(did, [
        didKeypair.didKey(),
        new DidKey(bbsKey),
        new DidKey(bbsPlusKey),
        new DidKey(psKey),
      ]);

      await didModule.createDocument(document, didKeypair);

      
    });

    test("Throws an error on missing `Blob`", async () => {
      const id = BlobId.random(DID.random());

      await expect(() => blobModule.get(id)).rejects.toThrow(
        new NoBlobError(id)
      );
    });

    test("`BlobResolver`", async () => {
      const resolver = new BlobResolver(blobModule);
      const did = DID.random();

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
