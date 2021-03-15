import { writeToIPFS, dereferenceFromIPFS } from '../../src/utils/rdf';

const rdfInput = `
  @prefix : <http://example.org/stuff/1.0/> .
  :a :b ( "apple" "banana" ) .
`;

const rdfCID = 'QmQeskBk9TsdWXaNX26PvuzkxU8zzoWZo5dmJMPuw5vcSS';

describe('IPFS', () => {
  test('Can write document to IPFs', async () => {
    const cid = await writeToIPFS(rdfInput);
    expect(cid.toString()).toEqual(rdfCID);
  }, 10000);

  test('Can dereference document from IPFs', async () => {
    const document = await dereferenceFromIPFS(rdfCID);
    expect(document).toEqual(rdfInput);
  }, 10000);
});
