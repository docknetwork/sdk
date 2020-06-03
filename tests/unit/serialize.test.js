import { randomAsHex, encodeAddress } from '@polkadot/util-crypto';

import VerifiableCredential from '../../src/verifiable-credential';
import VerifiablePresentation from '../../src/verifiable-presentation';
import exampleCredential from '../example-credential';

describe('Serialization', () => {
  test('VerifiableCredential from/to JSON serialization', () => {
    const vc = VerifiableCredential.fromJSON(exampleCredential);
    const vcJson = vc.toJSON();
    expect(vcJson).toMatchObject(exampleCredential);
  });


  test('VerifiablePresentation from/to JSON serialization', () => {
    const presentationId = 'http://example.edu/credentials/2803';
    const vp = new VerifiablePresentation(presentationId);
    vp.addContext('https://www.w3.org/2018/credentials/examples/v1');
    vp.addType('some_type');

    const vc = VerifiableCredential.fromJSON(exampleCredential);
    vp.addCredential(vc);

    const vpJson = vp.toJSON();

    const constructedVP = VerifiablePresentation.fromJSON(vpJson);
    expect(vpJson).toMatchObject(constructedVP.toJSON());
  });
});
