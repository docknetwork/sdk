import { randomAsHex } from '@polkadot/util-crypto';

import { u8aToHex } from '@polkadot/util';
import { DockAPI } from '../../../src';
import {
  createNewDockDID, typedHexDID, NoDIDError, NoOnchainDIDError,
} from '../../../src/utils/did';
import { FullNodeEndpoint, TestAccountURI, TestKeyringOpts } from '../../test-constants';
import { OffChainDidDocRef } from '../../../src/modules/did';

describe('Off-chain DIDs', () => {
  const dock = new DockAPI();

  // Generate a random DID
  const dockDID = createNewDockDID();
  const hexDID = typedHexDID(dock.api, dockDID);

  const firstDocRef = randomAsHex(100);
  const secondDocRef = randomAsHex(110);
  const thirdDocRef = randomAsHex(89);

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

  test('Can create an off-chain DID', async () => {
    // DID does not exist already
    await expect(dock.did.getOffchainDidDetail(hexDID)).rejects.toThrow(NoDIDError);

    const docRef = OffChainDidDocRef.cid(firstDocRef);
    await dock.did.newOffchain(dockDID, docRef, false);
    const didDetail = await dock.did.getOffchainDidDetail(hexDID);
    expect(didDetail.docRef).toEqual(docRef);
    expect(didDetail.accountId).toEqual(u8aToHex(dock.account.addressRaw));

    // DID cannot be fetched as on-chain DID
    await expect(dock.did.getOnchainDidDetail(hexDID)).rejects.toThrow(NoOnchainDIDError);
  });

  test('Can update DIDDoc reference for the DID to URL', async () => {
    const docRef = OffChainDidDocRef.url(secondDocRef);
    await dock.did.setOffchainDidRef(dockDID, docRef, false);
    const didDetail = await dock.did.getOffchainDidDetail(hexDID);
    expect(didDetail.docRef).toEqual(docRef);
    expect(didDetail.accountId).toEqual(u8aToHex(dock.account.addressRaw));
  });

  test('Can update DIDDoc reference for the DID to Custom', async () => {
    const docRef = OffChainDidDocRef.custom(thirdDocRef);
    await dock.did.setOffchainDidRef(dockDID, docRef, false);
    const didDetail = await dock.did.getOffchainDidDetail(hexDID);
    expect(didDetail.docRef).toEqual(docRef);
    expect(didDetail.accountId).toEqual(u8aToHex(dock.account.addressRaw));
  });

  test('Can remove the DID', async () => {
    await dock.did.removeOffchainDid(dockDID, false);
    await expect(dock.did.getOffchainDidDetail(hexDID)).rejects.toThrow(NoDIDError);
  });
});
