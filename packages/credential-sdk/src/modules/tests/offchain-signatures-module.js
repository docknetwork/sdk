import { DidKeypair, Ed25519Keypair } from '../../keypairs';
import {
  BBSParams,
  BBSParamsValue,
  BBSPlusParams,
  BBSPlusParamsValue,
  BBSPlusPublicKey,
  BBSPlusPublicKeyValue,
  BBSPublicKey,
  BBSPublicKeyValue,
  DIDDocument,
  DidKey,
  PSParams,
  PSParamsValue,
  PSPublicKey,
  PSPublicKeyValue,
} from '../../types';
import { testIf } from './common';
import { TypedBytes } from '../../types/generic';
import { stringToU8a } from '../../utils';

// eslint-disable-next-line jest/no-export
export default function generateOffchainSignatureModuleTests(
  {
    did: didModule, offchainSignatures, bbs, bbsPlus, ps,
  },
  { Did },
  filter = () => true,
) {
  const test = testIf(filter);

  describe(`Checks ${didModule.constructor.name} and ${offchainSignatures.constructor.name} with ${Did.name} and all public key types and params types`, () => {
    test('Generates a `DIDDocument` with `OffchainPublicKey` and creates a `OffchainParameters` owned by this DID', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      await didModule.createDocument(
        DIDDocument.create(did, [didKeypair.didKey()]),
        didKeypair,
      );

      const bbsParamsId = await offchainSignatures.nextParamsId(did);
      const bbsParamsRef = [did, bbsParamsId];
      const bbsParams = new BBSParams(
        new BBSParamsValue(TypedBytes.random(100), stringToU8a('bbs')),
      );
      await offchainSignatures.addParams(
        bbsParamsId,
        bbsParams,
        did,
        didKeypair,
      );

      const bbsPlusParamsId = await offchainSignatures.nextParamsId(did);
      const bbsPlusParamsRef = [did, bbsPlusParamsId];
      const bbsPlusParams = new BBSPlusParams(
        new BBSPlusParamsValue(TypedBytes.random(100), stringToU8a('bbs+')),
      );
      await offchainSignatures.addParams(
        bbsPlusParamsId,
        bbsPlusParams,
        did,
        didKeypair,
      );

      const psParamsId = await offchainSignatures.nextParamsId(did);
      const psParamsRef = [did, psParamsId];
      const psParams = new PSParams(
        new PSParamsValue(TypedBytes.random(100), stringToU8a('ps')),
      );
      await offchainSignatures.addParams(psParamsId, psParams, did, didKeypair);

      const bbsKey = new BBSPublicKey(
        new BBSPublicKeyValue(TypedBytes.random(100), bbsParamsRef),
      );
      const bbsPlusKey = new BBSPlusPublicKey(
        new BBSPlusPublicKeyValue(TypedBytes.random(100), bbsPlusParamsRef),
      );
      const psKey = new PSPublicKey(
        new PSPublicKeyValue(TypedBytes.random(100), psParamsRef),
      );

      const document = DIDDocument.create(did, [
        didKeypair.didKey(),
        new DidKey(bbsKey),
        new DidKey(bbsPlusKey),
        new DidKey(psKey),
      ]);

      await didModule.updateDocument(document, didKeypair);

      expect((await didModule.getDocument(did)).toJSON()).toEqual(
        document.toJSON(),
      );

      expect(
        (await offchainSignatures.getParams(did, bbsParamsId)).toJSON(),
      ).toEqual(bbsParams.toJSON());
      expect(
        (await offchainSignatures.getParams(did, bbsPlusParamsId)).toJSON(),
      ).toEqual(bbsPlusParams.toJSON());
      expect(
        (await offchainSignatures.getParams(did, psParamsId)).toJSON(),
      ).toEqual(psParams.toJSON());

      expect(
        (await offchainSignatures.getAllParamsByDid(did)).toJSON().sort(),
      ).toEqual(
        [
          [bbsParamsId.toJSON(), bbsParams.toJSON()],
          [bbsPlusParamsId.toJSON(), bbsPlusParams.toJSON()],
          [psParamsId.toJSON(), psParams.toJSON()],
        ].sort(),
      );

      expect((await bbsKey.withParams(offchainSignatures)).toJSON()).toEqual({
        bbs: { ...bbsKey.toJSON().bbs, params: bbsParams.toJSON() },
      });

      expect(
        (await bbsPlusKey.withParams(offchainSignatures)).toJSON(),
      ).toEqual({
        bbsPlus: {
          ...bbsPlusKey.toJSON().bbsPlus,
          params: bbsPlusParams.toJSON(),
        },
      });

      expect((await psKey.withParams(offchainSignatures)).toJSON()).toEqual({
        ps: {
          ...psKey.toJSON().ps,
          params: psParams.toJSON(),
        },
      });
    });

    test('Returns `null` in case of missing params', async () => {
      const did = Did.random();
      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      const psParamsId = await offchainSignatures.nextParamsId(did);
      const psParamsRef = [did, psParamsId];

      await didModule.createDocument(document, didKeypair);
      const psKey = new PSPublicKey(
        new PSPublicKeyValue(TypedBytes.random(1000), psParamsRef),
      );

      expect(
        await offchainSignatures.getParams(
          did,
          await offchainSignatures.nextParamsId(did),
        ),
      ).toBe(null);

      await expect(() => psKey.withParams(offchainSignatures)).rejects.toThrow();
    });
  });

  const cases = [
    {
      module: bbs,
      PublicKey: BBSPublicKey,
      Params: BBSParams,
    },
    {
      module: bbsPlus,
      PublicKey: BBSPlusPublicKey,
      Params: BBSPlusParams,
    },
    {
      module: ps,
      PublicKey: PSPublicKey,
      Params: PSParams,
    },
  ];

  describe.each(cases)(
    'Checks basic workflow for each module',
    ({ module, PublicKey, Params }) => {
      test(`Generates a \`DIDDocument\` with \`OffchainPublicKey\` and creates a \`OffchainParameters\` owned by this DID using ${module.constructor.name} with ${PublicKey.name} and ${Params.name}`, async () => {
        const did = Did.random();

        const keyPair = Ed25519Keypair.random();
        const didKeypair = new DidKeypair([did, 1], keyPair);

        await didModule.createDocument(
          DIDDocument.create(did, [didKeypair.didKey()]),
          didKeypair,
        );

        const id = await offchainSignatures.nextParamsId(did);
        const ref = [did, id];
        const params = new Params(
          new Params.Class(
            TypedBytes.random(100),
            stringToU8a(module.constructor.name),
          ),
        );

        expect(await module.getParams(did, id)).toEqual(null);

        await module.addParams(id, params, did, didKeypair);

        const key = new PublicKey(
          new PublicKey.Class(TypedBytes.random(100), ref),
        );

        const document = DIDDocument.create(did, [
          didKeypair.didKey(),
          new DidKey(key),
        ]);

        await didModule.updateDocument(document, didKeypair);

        expect((await didModule.getDocument(did)).toJSON()).toEqual(
          document.toJSON(),
        );

        expect((await module.getParams(did, id)).toJSON()).toEqual(
          params.toJSON(),
        );
      });
    },
  );
}
