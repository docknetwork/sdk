import { DidKeypair, Ed25519Keypair } from '../keypairs';
import { DIDDocument } from '../types';
import { itIf } from './common';

// eslint-disable-next-line jest/no-export
export default function generateAttestModuleTests(
  { did: didModule, attest: attestModule },
  { DID },
  filter = () => true,
) {
  const test = itIf(filter);

  test('Generates a `DIDDocument` and appends an attestation to it', async () => {
    const did = DID.random();

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
    expect(await attestModule.getAttests(DID.random())).toBe(null);
  });
}
