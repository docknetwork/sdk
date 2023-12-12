import { randomAsHex } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { DockAPI } from '../../../src';
import { createNewDockDID, typedHexDID, NoDIDError, DidKeypair } from '../../../src/utils/did';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { getPublicKeyFromKeyringPair } from '../../../src/utils/misc';
import { DidKey, VerificationRelationship } from '../../../src/public-keys';
import { ServiceEndpointType } from '../../../src/modules/did/service-endpoint';

describe('DID service endpoints', () => {
  const encoder = new TextEncoder();

  const dock = new DockAPI();

  const dockDid1 = createNewDockDID();
  const hexDid1 = typedHexDID(dock.api, dockDid1);

  // This DID will not be controlled by itself
  const dockDid2 = createNewDockDID();
  const hexDid2 = typedHexDID(dock.api, dockDid2);

  const seed1 = randomAsHex(32);
  const seed2 = randomAsHex(32);

  const spId1Text = `${dockDid1}#linked-domain-1`;
  const spId2Text = `${dockDid2}#linked-domain-1`;
  const spId3Text = `${dockDid2}#linked-domain-2`;
  const spId1 = u8aToHex(encoder.encode(spId1Text));
  const spId2 = u8aToHex(encoder.encode(spId2Text));
  const spId3 = u8aToHex(encoder.encode(spId3Text));

  const origins1Text = ['https://foo.example.com'];
  const origins2Text = ['https://foo.example.com', 'https://bar.example.com', 'https://baz.example.com'];
  const origins3Text = ['https://biz.example.com'];

  beforeAll(async () => {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    const account = dock.keyring.addFromUri(TestAccountURI);
    dock.setAccount(account);
  });

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);

  test('Create DIDs and add service endpoint', async () => {
    const pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    const publicKey1 = pair1.publicKey();
    const didKey1 = new DidKey(publicKey1, new VerificationRelationship());

    await dock.did.new(dockDid1, [didKey1], [], false);

    const spType = new ServiceEndpointType();
    spType.setLinkedDomains();

    // `dockDid1` adds service endpoint for itself
    const origins1 = origins1Text.map((u) => u8aToHex(encoder.encode(u)));
    await dock.did.addServiceEndpoint(spId1, spType, origins1, hexDid1, hexDid1, pair1, undefined, false);

    const sp = await dock.did.getServiceEndpoint(dockDid1, spId1);
    expect(sp.type).toEqual(spType);
    expect(sp.origins).toEqual(origins1);

    const pair2 = new DidKeypair(dock.keyring.addFromUri(seed2), 1);
    const publicKey2 = pair2.publicKey();
    const vr = new VerificationRelationship();
    vr.setAssertion();
    const didKey2 = new DidKey(publicKey2, vr);

    await dock.did.new(dockDid2, [didKey2], [hexDid1], false);

    // `dockDid1` adds service endpoint to `dockDid2`
    const origins2 = origins2Text.map((u) => u8aToHex(encoder.encode(u)));
    await dock.did.addServiceEndpoint(spId2, spType, origins2, hexDid2, hexDid1, pair1, undefined, false);

    const sp1 = await dock.did.getServiceEndpoint(dockDid2, spId2);
    expect(sp1.type).toEqual(spType);
    expect(sp1.origins).toEqual(origins2);
  });

  test('Get DID document with service endpoints', async () => {
    const doc1 = await dock.did.getDocument(dockDid1);
    expect(doc1.service.length).toEqual(1);
    expect(doc1.service[0].id).toEqual(spId1Text);
    expect(doc1.service[0].type).toEqual('LinkedDomains');
    expect(doc1.service[0].serviceEndpoint).toEqual(origins1Text);

    const doc2 = await dock.did.getDocument(dockDid2);
    expect(doc2.service.length).toEqual(1);
    expect(doc2.service[0].id).toEqual(spId2Text);
    expect(doc2.service[0].type).toEqual('LinkedDomains');
    expect(doc2.service[0].serviceEndpoint).toEqual(origins2Text);
  }, 10000);

  test('Add another service endpoint', async () => {
    const pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    const spType = new ServiceEndpointType();
    spType.setLinkedDomains();
    const origins = origins3Text.map((u) => u8aToHex(encoder.encode(u)));
    await dock.did.addServiceEndpoint(spId3, spType, origins, hexDid2, hexDid1, pair1, undefined, false);
    const sp = await dock.did.getServiceEndpoint(dockDid2, spId3);
    expect(sp.type).toEqual(spType);
    expect(sp.origins).toEqual(origins);
  });

  test('Get DID document with multiple service endpoints', async () => {
    const doc = await dock.did.getDocument(dockDid2);
    expect(doc.service.length).toEqual(2);
    expect(doc.service[0].type).toEqual('LinkedDomains');
    expect(doc.service[1].type).toEqual('LinkedDomains');
    expect(
      (doc.service[0].id === spId2Text && doc.service[1].id === spId3Text)
      || (doc.service[0].id === spId3Text && doc.service[1].id === spId2Text),
    ).toBe(true);

    expect(
      (JSON.stringify(doc.service[0].serviceEndpoint) === JSON.stringify(origins2Text) && JSON.stringify(doc.service[1].serviceEndpoint) === JSON.stringify(origins3Text))
      || (JSON.stringify(doc.service[0].serviceEndpoint) === JSON.stringify(origins3Text) && JSON.stringify(doc.service[1].serviceEndpoint) === JSON.stringify(origins2Text)),
    ).toBe(true);
  });

  test('Remove service endpoint', async () => {
    const pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);
    // `dockDid1` removes service endpoint of `dockDid2`
    await dock.did.removeServiceEndpoint(spId2, hexDid2, hexDid1, pair1, undefined, false);
    await expect(dock.did.getServiceEndpoint(dockDid2, spId2)).rejects.toThrow();
  });

  test('Removing DID removes service endpoint as well', async () => {
    const pair1 = new DidKeypair(dock.keyring.addFromUri(seed1), 1);

    await dock.did.remove(dockDid1, dockDid1, pair1);

    await expect(dock.did.getOnchainDidDetail(hexDid1.asDid)).rejects.toThrow(NoDIDError);
    await expect(dock.did.getServiceEndpoint(dockDid1, spId1)).rejects.toThrow();
  });
});
