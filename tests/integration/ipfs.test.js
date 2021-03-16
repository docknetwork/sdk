import { writeToIPFS, dereferenceFromIPFS } from '../../src/utils/rdf';
import createClient from 'ipfs-http-client';

const ipfsDefaultConfig = 'http://localhost:5001';

const rdfInput = `
  @prefix : <http://example.org/stuff/1.0/> .
  :a :b ( "apple" "banana" ) .
`;

const rdfCID = 'QmQeskBk9TsdWXaNX26PvuzkxU8zzoWZo5dmJMPuw5vcSS';

describe('IPFS', () => {
  let ipfsClient;
  beforeAll(done => {
    ipfsClient = createClient(connectionConfig);
    done();
  });

  test('Can dereference document from IPFs', async () => {
    // Write document to node
    const { cid } = await ipfsClient.add(document);
    expect(cid.toString()).toEqual(rdfCID);

    // Pull document as string
    const document = await dereferenceFromIPFS(rdfCID, ipfsClient);
    expect(document).toEqual(rdfInput);
  }, 10000);
});
