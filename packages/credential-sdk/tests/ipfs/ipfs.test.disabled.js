const ipfsDefaultConfig = "http://localhost:5001";

const rdfInput = `
  @prefix : <http://example.org/stuff/1.0/> .
  :a :b ( "apple" "banana" ) .
`;

const rdfCID = "bafkreia2fxwzy4hs6pkl7aygxl4t7ws2euxs7jbkp7qacmljqful2anwei";

describe("IPFS", () => {
  let ipfsClient;
  beforeAll(async () => {
    const { createHelia } = await import("helia");
    const { strings } = await import("@helia/strings");
    ipfsClient = strings(await createHelia(ipfsDefaultConfig));
  });

  test("Can dereference document from IPFs", async () => {
    // Write document to node
    const cid = await ipfsClient.add(rdfInput);
    expect(cid.toString()).toEqual(rdfCID);

    // Pull document as string
    const document = await ipfsClient.get(cid);
    expect(document).toEqual(rdfInput);
  }, 10000);

  test("Dereference from IPNS fails", async () => {
    await expect(
      ipfsClient.get("/ipns/QmSrPmbaUKA3ZodhzPWZnpFgcPMFWF4QsxXbkWfEptTBJd"),
    ).rejects.toThrow();
  }, 10000);
});
