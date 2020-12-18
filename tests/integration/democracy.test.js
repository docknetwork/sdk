import dock from '../../src/api';
import { randomAsHex } from '@polkadot/util-crypto';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';

const CouncilMemberAccountUri = '//Alice//stash';
const CouncilMember2AccountUri = '//Bob//stash';
const CouncilMember3AccountUri = '//Charlie';

async function giveBalance(address) {
  dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
  const transfer = dock.api.tx.balances.transfer(address, 1000000000);
  await dock.signAndSend(transfer);
}

async function connectAndInit() {
  if (!dock.isConnected) {
    await dock.init({
      keyring: TestKeyringOpts,
      address: FullNodeEndpoint,
    });
    await giveBalance(dock.keyring.addFromUri(CouncilMember3AccountUri).address);
  }
}

describe('Tech-committee Membership', () => {
  let newMemberAccount;

  beforeAll(async (done) => {
    await connectAndInit();

    // Create new council member account with balance
    newMemberAccount = dock.keyring.addFromUri(randomAsHex(32));
    await giveBalance(newMemberAccount.address);

    done();
  }, 300000);

  test('Change tech-committee membership (accepted)', async () => {
    let proposals;
    let proposalHash;
    let proposalIndex;
    let newMembers;

    // Get current members and proposal count
    const councilMembers = await dock.council.getMembers();
    expect(councilMembers.length).toEqual(3); // We require 3 members so that 2 is a simple majority

    // Create proposal from first member account
    dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));

    // Get current members and proposal count
    const members = await dock.council.getTechComitteeMembers();
    const proposalCount = await dock.council.getOpenProposalCount();
    expect(members.length).toEqual(3); // Ensure we have default commitee members

    // Add a new member to the committee with simple majority
    // Account 1 proposes and implicitly approves
    const proposalToAdd = dock.council.addTechCommitteeMember(newMemberAccount.address);

    // 2 out of 3 make simple majority
    await dock.council.makeProposal(proposalToAdd, 2);

    // Ensure proposal was added
    const newProposalCount = await dock.council.getOpenProposalCount();
    expect(newProposalCount).toBe(proposalCount + 1);

    // Get proposals
    proposals = await dock.council.getProposals();
    proposalHash = proposals[proposals.length - 1];
    proposalIndex = await dock.council.getProposalIndex(proposalHash);

    // Create approval vote from council member 2
    dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
    await dock.council.vote(proposalHash, proposalIndex, true);

    // Any account can then close the proposal
    await dock.council.closeProposal(proposalHash, proposalIndex);

    // Ensure new member was added
    newMembers = await dock.council.getTechComitteeMembers();
    expect(newMembers.length).toBe(members.length + 1);

    // Ensure proposal was closed
    const finalProposalCount = await dock.council.getOpenProposalCount();
    expect(finalProposalCount).toBe(proposalCount);

    // Remove member from committee with simple majority
    const proposalToRemove = dock.council.removeTechCommitteeMember(newMemberAccount.address);

    // 3 out of 43 make simple majority
    // Council member 3 proposes
    dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));
    await dock.council.makeProposal(proposalToRemove, 3);

    // Get proposals
    proposals = await dock.council.getProposals();
    proposalHash = proposals[proposals.length - 1];
    proposalIndex = await dock.council.getProposalIndex(proposalHash);

    // Create approval vote from council member 1
    dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
    await dock.council.vote(proposalHash, proposalIndex, true);

    // Create approval vote from new committee member
    dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
    await dock.council.vote(proposalHash, proposalIndex, true);

    // Any account can then close the proposal
    await dock.council.closeProposal(proposalHash, proposalIndex);

    // Ensure new member was removed
    newMembers = await dock.council.getTechComitteeMembers();
    expect(newMembers.length).toBe(members.length);
  }, 300000);

  test('Change tech-committee membership (rejected)', async () => {
    // Create proposal from 3rd council member
    expect(members.length).toEqual(3); // We require 3 members so that 2 is a simple majorit
    dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));

     // Ensure we have default commitee members
    const committeeMembers = await dock.council.getTechComitteeMembers();
    expect(committeeMembers.length).toEqual(3);

    // Get current members and proposal count
    const members = await dock.council.getMembers();
    expect(members.length).toEqual(3); // We require 3 members so that 2 is a simple majority
    const proposalCount = await dock.council.getOpenProposalCount();

    // Add a new member to Council with simple majority
    // Account 1 proposes and implicitly approves
    const proposalToAdd = dock.council.addTechCommitteeMember(newMemberAccount.address);

    // 2 out of 3 make simple majority
    await dock.council.makeProposal(proposalToAdd, 2);

    // Ensure proposal was added
    const proposals = await dock.council.getProposals();
    expect(proposals.length).toBe(proposalCount + 1);

    const proposalHash = proposals[proposals.length - 1];
    const proposalIndex = await dock.council.getProposalIndex(proposalHash);

    // Create rejection vote from council member 2
    dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
    await dock.council.vote(proposalHash, proposalIndex, false);

    // Create rejection vote from council member 1
    dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
    await dock.council.vote(proposalHash, proposalIndex, false);

    // Any account can then close the proposal
    await dock.council.closeProposal(proposalHash, proposalIndex);

    // Ensure proposal was closed
    const currentProposalCount = await dock.council.getOpenProposalCount();
    expect(currentProposalCount).toEqual(proposalCount);

    // Ensure members were not changed
    const currentMembers = await dock.council.getTechComitteeMembers();
    expect(currentMembers.length).toEqual(committeeMembers.length);
  }, 300000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});

// describe('Council Membership', () => {
//   let newMemberAccount;
//
//   beforeAll(async (done) => {
//     await connectAndInit();
//
//     // Create new council member account with balance
//     newMemberAccount = dock.keyring.addFromUri(randomAsHex(32));
//     await giveBalance(newMemberAccount.address);
//
//     done();
//   }, 300000);
//
//   test('Change council membership (accepted)', async () => {
//     let proposals;
//     let proposalHash;
//     let proposalIndex;
//     let newMembers;
//
//     // Create proposal from first member account
//     dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
//
//     // Get current members and proposal count
//     const members = await dock.council.getMembers();
//     expect(members.length).toEqual(3); // We require 3 members so that 2 is a simple majority
//     const proposalCount = await dock.council.getOpenProposalCount();
//
//     // Add a new member to Council with simple majority
//     // Account 1 proposes and implicitly approves
//     const proposalToAdd = dock.council.addMember(newMemberAccount.address);
//
//     // 2 out of 3 make simple majority
//     await dock.council.makeProposal(proposalToAdd, 2);
//
//     // Ensure proposal was added
//     const newProposalCount = await dock.council.getOpenProposalCount();
//     expect(newProposalCount).toBe(proposalCount + 1);
//
//     // Get proposals
//     proposals = await dock.council.getProposals();
//     proposalHash = proposals[proposals.length - 1];
//     proposalIndex = await dock.council.getProposalIndex(proposalHash);
//
//     // Create approval vote from council member 2
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposalconnected
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure new member was added
//     newMembers = await dock.council.getMembers();
//     expect(newMembers.length).toBe(members.length + 1);
//
//     // Ensure proposal was closed
//     const finalProposalCount = await dock.council.getOpenProposalCount();
//     expect(finalProposalCount).toBe(proposalCount);
//
//     // Remove member from Council with simple majority
//     const proposalToRemove = dock.council.removeMember(newMemberAccount.address);
//
//     // 3 out of 43 make simple majority
//     // Council member 2 proposes
//     await dock.council.makeProposal(proposalToRemove, 3);
//
//     // Get proposals
//     proposals = await dock.council.getProposals();
//     proposalHash = proposals[proposals.length - 1];
//     proposalIndex = await dock.council.getProposalIndex(proposalHash);
//
//     // Create approval vote from council member 1
//     dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Create approval vote from just added member
//     dock.setAccount(newMemberAccount);
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure new member was removed
//     newMembers = await dock.council.getMembers();
//     expect(newMembers.length).toBe(members.length);
//   }, 300000);
//
//   test('Change council membership (rejected)', async () => {
//     // Create proposal from first member account
//     dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
//
//     // Get current members and proposal count
//     const members = await dock.council.getMembers();
//     expect(members.length).toEqual(3); // We require 3 members so that 2 is a simple majority
//     const proposalCount = await dock.council.getOpenProposalCount();
//
//     // Add a new member to Council with simple majority
//     // Account 1 proposes and implicitly approves
//     const proposalToAdd = dock.council.addMember(newMemberAccount.address);
//
//     // 2 out of 3 make simple majority
//     await dock.council.makeProposal(proposalToAdd, 2);
//
//     // Get proposals
//     const proposals = await dock.council.getProposals();
//
//     // Ensure proposal was added
//     expect(proposals.length).toBe(proposalCount + 1);
//
//     const proposalHash = proposals[proposals.length - 1];
//     const proposalIndex = await dock.council.getProposalIndex(proposalHash);
//
//     // Create rejection vote from council member 2
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, false);
//
//     // Create rejection vote from council member 3
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, false);
//
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure proposal was closed
//     const currentProposalCount = await dock.council.getOpenProposalCount();
//     expect(currentProposalCount).toEqual(proposalCount);
//
//     // Get current members and proposal count
//     const currentMembers = await dock.council.getMembers();
//     expect(currentMembers.length).toEqual(members.length);
//
//   }, 300000);
//
//   afterAll(async () => {
//     await dock.disconnect();
//   }, 10000);
// });
