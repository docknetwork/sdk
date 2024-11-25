import { DidKeypair, Ed25519Keypair } from '../../keypairs';
import { DIDDocument } from '../../types';
import { itIf } from './common';
import { StatusList2021Resolver } from '../../resolver/status-list2021';
import { stringToU8a } from '../../utils';

// eslint-disable-next-line jest/no-export
export default function generateStatusListCredentialModuleTests(
  { did: didModule, statusListCredential: statusListCredentialModule },
  { DID, StatusListCredentialId },
  filter = () => true,
) {
  const test = itIf(filter);

  describe(`Using ${didModule.constructor.name} and ${statusListCredentialModule.constructor.name}`, () => {
    test('Generates a `DIDDocument` and creates a `StatusListCredential` owned by this DID', async () => {
      const did = DID.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      const id1 = StatusListCredentialId.random(did);
      const statusListCredential1 = await StatusList2021Credential.create(
        keyPair,
        id1,
        { revokeIndices: [1, 10, 100] }
      );

      await statusListCredentialModule.create(id, statusListCredential1, didKeypair);

      const written1 = await statusListCredentialModule.getStatusListCredential(id1);
      expect(written1.toJSON()).toEqual(statusListCredential1.toJSON());

      const id2 = StatusListCredentialId.random(did);
      const statusListCredential2 = await StatusList2021Credential.create(
        keyPair,
        id2,
        { revokeIndices: [2, 20, 200] }
      );

      await statusListCredentialModule.create(id2, statusListCredential2, didKeypair);

      const written2 = await statusListCredentialModule.getStatusListCredential(id2);
      expect(written2.toJSON()).toEqual(statusListCredential2.toJSON());
    });

    test('Generates a `DIDDocument` and cretes and then updates a `StatusListCredential` owned by this DID', async () => {
      const did = DID.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      const id = StatusListCredentialId.random(did);
      const statusListCredential = await StatusList2021Credential.create(
        keyPair,
        id,
        { revokeIndices: [1, 10, 100] }
      );

      await statusListCredentialModule.create(id, statusListCredential, didKeypair);
      let written = await statusListCredentialModule.getStatusListCredential(id);
      expect(written.toJSON()).toEqual(statusListCredential.toJSON());

      await statusListCredential.update(keyPair, { revokeIndices: [ 2, 3, 4] });

      await statusListCredentialModule.update(id, statusListCredential, didKeypair);
      written = await statusListCredentialModule.getStatusListCredential(id);
      expect(written.toJSON()).toEqual(statusListCredential.toJSON());
    });


    test('Generates a `DIDDocument` and creates and then removes a `StatusListCredential` owned by this DID', async () => {
      const did = DID.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      const id = StatusListCredentialId.random(did);
      const statusListCredential = await StatusList2021Credential.create(
        keyPair,
        id,
        { revokeIndices: [1, 10, 100] }
      );

      await statusListCredentialModule.create(id, statusListCredential, didKeypair);
      const written = await statusListCredentialModule.getStatusListCredential(id);
      expect(written.toJSON()).toEqual(statusListCredential.toJSON());

      await statusListCredential.remove(id);

      expect(written.toJSON()).toEqual(statusListCredential.toJSON());
    });

    test('`StatusList2021Resolver`', async () => {
      const resolver = new StatusList2021Resolver(statusListCredentialModule);
      const did = DID.random();

      const keyPair = Ed25519Keypair.random();
      const didKeypair = new DidKeypair([did, 1], keyPair);

      const document = DIDDocument.create(did, [didKeypair.didKey()]);

      await didModule.createDocument(document, didKeypair);

      const id = StatusListCredentialId.random(did);
      const statusListCredential = await StatusList2021Credential.create(
        keyPair,
        id,
        { revokeIndices: [1, 10, 100] }
      );

      await statusListCredentialModule.create(statusListCredential, didKeypair);
      expect(await resolver.resolve(String(id))).toEqual([
        String(did),
        stringToU8a(statusListCredential.toJSON()),
      ]);
    });
  });
}
