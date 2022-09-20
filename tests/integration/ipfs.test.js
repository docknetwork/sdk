import { create } from 'ipfs-http-client';
import { dereferenceFromIPFS } from '../../src/utils/rdf';

const ipfsDefaultConfig = 'http://localhost:5001';

const rdfInput = `
  @prefix : <http://example.org/stuff/1.0/> .
  :a :b ( "apple" "banana" ) .
`;

const rdfCID = 'QmQeskBk9TsdWXaNX26PvuzkxU8zzoWZo5dmJMPuw5vcSS';

describe('IPFS', () => {
  let ipfsClient;
  beforeAll((done) => {
    ipfsClient = create(ipfsDefaultConfig);
    done();
  });

  test('Can dereference document from IPFs', async () => {
    // Write document to node
    const { cid } = await ipfsClient.add(rdfInput);
    expect(cid.toString()).toEqual(rdfCID);

    // Pull document as string
    const document = await dereferenceFromIPFS(rdfCID, ipfsClient);
    expect(document).toEqual(rdfInput);
  }, 10000);

  test('Dereference from IPNS fails', async () => {
    await expect(
      dereferenceFromIPFS('/ipns/QmSrPmbaUKA3ZodhzPWZnpFgcPMFWF4QsxXbkWfEptTBJd', ipfsClient),
    ).rejects.toThrow();
  }, 10000);
});
