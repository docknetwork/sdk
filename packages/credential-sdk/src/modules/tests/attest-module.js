import { DidKeypair, Ed25519Keypair } from '../../keypairs';
import { DIDDocument } from '../../types';
import { testIf } from './common';

// eslint-disable-next-line jest/no-export
export default function generateAttestModuleTests(
  { did: didModule, attest: attestModule },
  { Did },
  filter = () => true,
) {
  const test = testIf(filter);

  describe(`Using ${didModule.constructor.name} and ${attestModule.constructor.name} with ${Did.name}`, () => {
    test('Generates a `DIDDocument` and appends an `Attest` to it', async () => {
      const did = Did.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      expect((await didModule.getDocument(did)).toJSON()).toEqual(
        document.toJSON(),
      );

      const iri = 'some iri';
      await attestModule.setClaim(iri, did, didKeypair);

      expect((await attestModule.getAttests(did)).toString()).toBe(iri);
      document.setAttests(iri);
      expect((await didModule.getDocument(did)).toJSON()).toEqual(
        document.toJSON(),
      );

      const iri2 = 'other iri';
      await attestModule.setClaim(iri2, did, didKeypair);

      expect((await attestModule.getAttests(did)).toString()).toBe(iri2);
      document.setAttests(iri2);
      expect((await didModule.getDocument(did)).toJSON()).toEqual(
        document.toJSON(),
      );
    });

    test('Returns `null` on missing attest', async () => {
      expect(await attestModule.getAttests(Did.random())).toBe(null);
    });
  });
}
