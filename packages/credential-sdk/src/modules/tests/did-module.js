import { DidKeypair, Ed25519Keypair } from '../../keypairs';
import { DIDResolver } from '../../resolver';
import {
  DIDDocument,
  BBSPublicKeyValue,
  DidKey,
  BBSPlusPublicKeyValue,
  PSPublicKeyValue,
  VerificationMethodRef,
  ServiceEndpoint,
} from '../../types';
import { TypedBytes } from '../../types/generic';
import { NoDIDError } from '../abstract/did/errors';
import { testIf } from './common';

// eslint-disable-next-line jest/no-export
export default function generateDIDModuleTests(
  { did: module },
  { Did, ParamsId },
  filter = () => true,
) {
  const test = testIf(filter);

  describe(`Using ${module.constructor.name} with ${Did.name}`, () => {
    test('Creates basic `DIDDocument` with keys', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await module.createDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);
    });

    test('Creates `DIDDocument` containing BBS/BBSPlus/PS keys', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const paramsRef = [did, ParamsId.random()];

      const bbsKey = new BBSPublicKeyValue(TypedBytes.random(100), paramsRef);
      const bbsPlusKey = new BBSPlusPublicKeyValue(
        TypedBytes.random(100),
        paramsRef,
      );
      const psKey = new PSPublicKeyValue(TypedBytes.random(1000), paramsRef);

      const document = DIDDocument.create(did, [
        didKeypair.didKey(),
        new DidKey(bbsKey),
        new DidKey(bbsPlusKey),
        new DidKey(psKey),
      ]);

      await module.createDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);
    });

    test('Updates `DIDDocument` containing BBS/BBSPlus/PS keys', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const bbsKey = new DidKey(new BBSPublicKeyValue(TypedBytes.random(100)));
      const bbsPlusKey = new DidKey(
        new BBSPlusPublicKeyValue(TypedBytes.random(100)),
      );
      const psKey = new DidKey(new PSPublicKeyValue(TypedBytes.random(1000)));

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await module.createDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);

      document.addKey([did, document.nextKeyIndex()], bbsKey);
      document.addKey([did, document.nextKeyIndex()], bbsPlusKey);
      document.addKey([did, document.nextKeyIndex()], psKey);

      await module.updateDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);

      expect(document.didKeys().toJSON()).toEqual([
        [
          didKeypair.verificationMethodId.toJSON(),
          didKeypair.didKey().toJSON(),
        ],
        [new VerificationMethodRef(did, 2).toJSON(), bbsKey.toJSON()],
        [new VerificationMethodRef(did, 3).toJSON(), bbsPlusKey.toJSON()],
        [new VerificationMethodRef(did, 4).toJSON(), psKey.toJSON()],
      ]);
    });

    test('Creates `DIDDocument` containing services', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const service1 = new ServiceEndpoint('LinkedDomains', [
        'ServiceEndpoint#1',
      ]);
      const service2 = new ServiceEndpoint('DIDCommMessaging', [
        'ServiceEndpoint#2',
      ]);

      const document = DIDDocument.create(did, [didKeypair.didKey()], [], {
        service1,
        service2,
      });

      await module.createDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);
    });

    test('Updates `DIDDocument` containing services', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const service1 = new ServiceEndpoint('LinkedDomains', [
        'ServiceEndpoint#1',
      ]);
      const service2 = new ServiceEndpoint('DIDCommMessaging', [
        'ServiceEndpoint#2',
      ]);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await module.createDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);

      document.addServiceEndpoint([did, 'service1'], service1);
      document.addServiceEndpoint([did, 'service2'], service2);

      await module.updateDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);

      document.removeServiceEndpoint([did, 'service2']);

      await module.updateDocument(document, didKeypair);

      expect((await module.getDocument(did)).eq(document)).toBe(true);

      expect(document.service.length).toEqual(1);
    });

    test("Updates `DIDDocument`'s keys", async () => {
      const did = Did.random();

      const keyPair1 = Ed25519Keypair.random();
      const keyPair2 = Ed25519Keypair.random();
      const keyPair3 = Ed25519Keypair.random();

      const didKeypair1 = new DidKeypair([did, 1], keyPair1);
      const didKeypair2 = new DidKeypair([did, 2], keyPair2);
      const didKeypair3 = new DidKeypair([did, 3], keyPair3);

      const document = DIDDocument.create(did, [
        didKeypair1.didKey(),
        didKeypair2.didKey(),
      ]);

      await module.createDocument(document, didKeypair2);
      expect((await module.getDocument(did)).eq(document)).toBe(true);

      document.removeKey([did, 2]);
      await module.updateDocument(document, didKeypair1);
      expect((await module.getDocument(did)).eq(document)).toBe(true);

      document.addKey([did, 3], didKeypair3.didKey());
      await expect(() => module.updateDocument(document, didKeypair2)).rejects.toThrow();

      await module.updateDocument(document, didKeypair1);
      expect((await module.getDocument(did)).eq(document)).toBe(true);
    });

    test('Removes (deactivates) `DIDDocument`', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await module.createDocument(document, didKeypair);
      expect((await module.getDocument(did)).eq(document)).toBe(true);

      await module.removeDocument(did, didKeypair);
      await expect(() => module.getDocument(did)).rejects.toThrow(
        new NoDIDError(did),
      );
    });

    test("Throws an error if `DIDDocument` doesn't exist", async () => {
      const did = Did.random();

      await expect(() => module.getDocument(did)).rejects.toThrow(
        new NoDIDError(did),
      );
    });

    test('`DIDResolver`', async () => {
      const resolver = new DIDResolver(module);
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await module.createDocument(document, didKeypair);

      expect(
        DIDDocument.from(await resolver.resolve(String(did))).eq(document),
      ).toBe(true);
    });
  });
}
