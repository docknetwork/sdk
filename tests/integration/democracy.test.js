import dock from '../../src/api';
import { randomAsHex, blake2AsHex } from '@polkadot/util-crypto';

import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';

// TODO: adjust these, tests take forever - i think we can do better with different node values
const REFERENDUM_PROGRESS_WAIT = 180000; // 2.5 minutes
const PROPOSAL_PROGRESS_WAIT = 20000; // 20 seconds

// TODO: refactor into an array
const CouncilMemberAccountUri = '//Alice//stash';
const CouncilMember2AccountUri = '//Bob//stash';
const CouncilMember3AccountUri = '//Charlie';

const TechCommitteeMemberUris = [
  '//Dave',
  '//Charlie',
  '//Eve',
];

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

async function council_votes_and_concludes(proposalHash, balance_set_prop, referendumIndex) {
  console.log('council_votes_and_concludes', proposalHash, referendumIndex)

  // TODO: are we passing invalid proposalHash here?
  // proposal index is null
  const proposalIndex = await dock.techCommittee.getTechComitteeProposalIndex(proposalHash);
  console.log('proposalIndex', proposalIndex)

  // Member 1 approves
  dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
  await dock.council.vote(proposalHash, proposalIndex, true);

  // Member 2 disapproves
  dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
  await dock.council.vote(proposalHash, proposalIndex, false);

  let status = await dock.democracy.getReferendumStatus(referendumIndex);
  console.log('status', status)
  expect(status).toMatchObject(
    expect.objectContaining({
      Ongoing: {
        tally: { ayes: 1, nays: 1, turnout: 0 }
      }
    }),
  );

    // assert_eq!(
    //     ForkedDemocracy::referendum_status(0).unwrap().tally,
    //     Tally {
    //         ayes: 1,
    //         nays: 1,
    //         turnout: 0
    //     }
    // );

  // Last member approves
  dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));
  await dock.council.vote(proposalHash, proposalIndex, true);

  status = await dock.democracy.getReferendumStatus(referendumIndex);
  console.log('status2', status)
  expect(status).toMatchObject(
    expect.objectContaining({
      Ongoing: {
        tally: { ayes: 2, nays: 1, turnout: 0 }
      }
    }),
  );

    // assert_eq!(
    //     ForkedDemocracy::referendum_status(0).unwrap().tally,
    //     Tally {
    //         ayes: 2,
    //         nays: 1,
    //         turnout: 0
    //     }
    // );



    // assert!(pallet_scheduler::Agenda::<TestRuntime>::get(12).is_empty());
    //
    // let _ = <TestRuntime as pallet_democracy::Trait>::Currency::deposit_creating(&10, 1000);
    // assert_eq!(Balances::free_balance(10), 1000);
    //
    // assert!(Democracy::get_preimage(balance_set_prop_hash).is_none());
    // Democracy::note_preimage(Origin::signed(10), balance_set_prop).unwrap();
    // assert!(Democracy::get_preimage(balance_set_prop_hash).is_some());
    // assert!(Balances::free_balance(10) < 1000);
    //
    // fast_forward_to(10);
    // assert!(ForkedDemocracy::referendum_status(0).is_err());
    // // The proposal is scheduled to be enacted
    // assert!(pallet_scheduler::Agenda::<TestRuntime>::get(12)[0].is_some());
    // assert_eq!(Balances::free_balance(42), 0);
    //
    // fast_forward_to(12);
    // assert_eq!(Balances::free_balance(42), 2);
    // assert_eq!(Balances::free_balance(10), 1000);
    // // The proposal is enacted
    // assert!(pallet_scheduler::Agenda::<TestRuntime>::get(12).is_empty());
}

async function conclude_proposal(balance_set_prop_hash, balance_set_prop) {
  // Get current referendum count
  const currentRefCount = await dock.democracy.getReferendumCount();

  // Wait for referendum to process
  await new Promise((r) => setTimeout(r, 80000));

  // Ensure referendum was set
  expect(await dock.democracy.getReferendumCount()).toEqual(currentRefCount + 1);

  // Check referendum status
  const status = await dock.democracy.getReferendumStatus(currentRefCount);
  expect(status).toMatchObject(
    expect.objectContaining({
      Ongoing: {
        end: expect.any(Number),
        proposalHash: balance_set_prop_hash,
        threshold: 'Simplemajority',
        delay: expect.any(Number),
        tally: { ayes: 0, nays: 0, turnout: 0 }
      }
    }),
  );

  await council_votes_and_concludes(balance_set_prop_hash, balance_set_prop, currentRefCount)
}

describe('Proposal proposing', () => {
  beforeAll(async (done) => {
    await connectAndInit();
    done();
  }, 320000);

  test('Council proposes root action and accepts', async () => {
    expect(await dock.democracy.getNextExternal()).toEqual(null);

    // Create set balance root extrinsic to propose
    const newBalance = 10000000000;
    const rootAction = dock.api.tx.balances.setBalance(dock.keyring.addFromUri(CouncilMember3AccountUri).address, newBalance, 0);

    // Create proposal of council member
    const councilPropHash = dock.council.getProposalHash(rootAction);
    const councilProposal = dock.democracy.councilPropose(councilPropHash);

    // Must propose as council member
    dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
    await dock.council.executeProposal(councilProposal);

    // Ensure external proposal was added
    expect(await dock.democracy.getNextExternal()).not.toEqual(null);

    // TODO: conclude
    await conclude_proposal(councilPropHash, councilProposal);
  }, 320000);

  afterAll(async () => {
    await dock.disconnect();
  }, 10000);
});

// describe('Tech-committee', () => {
//   let newMemberAccount;
//
//   beforeAll(async (done) => {
//     await connectAndInit();
//
//     // Create new council member account with balance
//     newMemberAccount = dock.keyring.addFromUri(randomAsHex(32));
//     await giveBalance(newMemberAccount.address);
//     await giveBalance(dock.keyring.addFromUri(TechCommitteeMemberUris[0]).address);
//     await giveBalance(dock.keyring.addFromUri(TechCommitteeMemberUris[1]).address);
//     await giveBalance(dock.keyring.addFromUri(TechCommitteeMemberUris[2]).address);
//
//     done();
//   }, 320000);
//
//   test('Tech committee fast tracks', async () => {
//     // Get current members and proposal count
//     const councilMembers = await dock.council.getMembers();
//     expect(councilMembers.length).toEqual(3); // Ensure we have default council members
//
//     // Get current members and proposal count
//     const members = await dock.techCommittee.getTechComitteeMembers();
//     expect(members.length).toEqual(3); // Ensure we have default commitee members
//
//     // Create set balance root extrinsic to propose
//     const rootAction = dock.api.tx.balances.setBalance(dock.keyring.addFromUri(CouncilMember3AccountUri).address, 10000000000, 0); // TODO: do we need the extra stuff in set_balance_proposal_hash_and_note?
//
//     // Create proposal of council member
//     const councilPropHash = dock.council.getProposalHash(rootAction);
//     const councilProposal = dock.democracy.councilPropose(councilPropHash);
//
//     // Execute as council member
//     dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
//     await dock.council.executeProposal(councilProposal);
//
//     // Wait for referendum to process
//     await new Promise((r) => setTimeout(r, PROPOSAL_PROGRESS_WAIT));
//     const currentRefCount = await dock.democracy.getReferendumCount();
//
//     // Member 1 of technical committee proposes to set the voting period as 3 blocks and delay as 1 block
//     dock.setAccount(dock.keyring.addFromUri(TechCommitteeMemberUris[0]));
//     const proposalToFastTrack = dock.democracy.fastTrack(councilPropHash, 3, 1);
//     await dock.techCommittee.makeTechCommitteeProposal(proposalToFastTrack, 2);
//
//     // Ensure proposal was added
//     const techProposals = await dock.techCommittee.getTechComitteeProposals();
//     expect(techProposals.length).toBeGreaterThan(0);
//
//     // Get proposal hash and index
//     const proposalHash = techProposals[techProposals.length - 1];
//     const proposalIndex = await dock.techCommittee.getTechComitteeProposalIndex(proposalHash);
//
//     // Member 2 approves
//     dock.setAccount(dock.keyring.addFromUri(TechCommitteeMemberUris[1]));
//     await dock.techCommittee.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposal
//     await dock.techCommittee.closeTechComitteeProposal(proposalHash, proposalIndex);
//
//     // Wait for referendum to process
//     await new Promise((r) => setTimeout(r, REFERENDUM_PROGRESS_WAIT));
//
//     // Ensure referendum was added
//     expect(await dock.democracy.getReferendumCount()).toEqual(currentRefCount + 1);
//
//     // Check referendum status
//     const status = await dock.democracy.getReferendumStatus(currentRefCount);
//     expect(status).toMatchObject(
//       expect.objectContaining({
//         Ongoing: {
//           end: expect.any(Number),
//           proposalHash: councilPropHash,
//           threshold: 'Simplemajority',
//           delay: expect.any(Number),
//           tally: { ayes: 0, nays: 0, turnout: 0 }
//         }
//       }),
//     );
//
//     // Cancel referendum
//     dock.setAccount(dock.keyring.addFromUri('//Alice'));
//     await dock.democracy.cancelReferendum(currentRefCount);
//   }, 320000);
//
//   test('Change tech-committee membership (accepted)', async () => {
//     let proposals;
//     let proposalHash;
//     let proposalIndex;
//     let newMembers;
//
//     // Get current members and proposal count
//     const councilMembers = await dock.council.getMembers();
//     expect(councilMembers.length).toEqual(3); // We require 3 members so that 2 is a simple majority
//
//     // Create proposal from first member account
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));
//
//     // Get current members and proposal count
//     const members = await dock.techCommittee.getTechComitteeMembers();
//     const proposalCount = await dock.council.getOpenProposalCount();
//     expect(members.length).toEqual(3); // Ensure we have default commitee members
//
//     // Add a new member to the committee with simple majority
//     // Account 1 proposes and implicitly approves
//     const proposalToAdd = dock.techCommittee.addTechCommitteeMember(newMemberAccount.address);
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
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure new member was added
//     newMembers = await dock.techCommittee.getTechComitteeMembers();
//     expect(newMembers.length).toBe(members.length + 1);
//
//     // Ensure proposal was closed
//     const finalProposalCount = await dock.council.getOpenProposalCount();
//     expect(finalProposalCount).toBe(proposalCount);
//
//     // Remove member from committee with simple majority
//     const proposalToRemove = dock.techCommittee.removeTechCommitteeMember(newMemberAccount.address);
//
//     // 3 out of 43 make simple majority
//     // Council member 3 proposes
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));
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
//     // Create approval vote from new committee member
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure new member was removed
//     newMembers = await dock.techCommittee.getTechComitteeMembers();
//     expect(newMembers.length).toBe(members.length);
//   }, 320000);
//
//   test('Change tech-committee membership (rejected)', async () => {
//     // Create proposal from 3rd council member
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember3AccountUri));
//
//      // Ensure we have default commitee members
//     const committeeMembers = await dock.techCommittee.getTechComitteeMembers();
//     expect(committeeMembers.length).toEqual(3);
//
//     // Get current members and proposal count
//     const members = await dock.council.getMembers();
//     expect(members.length).toEqual(3); // We require 3 members so that 2 is a simple majority
//     const proposalCount = await dock.council.getOpenProposalCount();
//
//     // Add a new member to Council with simple majority
//     // Account 1 proposes and implicitly approves
//     const proposalToAdd = dock.techCommittee.addTechCommitteeMember(newMemberAccount.address);
//
//     // 2 out of 3 make simple majority
//     await dock.council.makeProposal(proposalToAdd, 2);
//
//     // Ensure proposal was added
//     const proposals = await dock.council.getProposals();
//     expect(proposals.length).toBe(proposalCount + 1);
//
//     const proposalHash = proposals[proposals.length - 1];
//     const proposalIndex = await dock.council.getProposalIndex(proposalHash);
//
//     // Create rejection vote from council member 2
//     dock.setAccount(dock.keyring.addFromUri(CouncilMember2AccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, false);
//
//     // Create rejection vote from council member 1
//     dock.setAccount(dock.keyring.addFromUri(CouncilMemberAccountUri));
//     await dock.council.vote(proposalHash, proposalIndex, false);
//
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure proposal was closed
//     const currentProposalCount = await dock.council.getOpenProposalCount();
//     expect(currentProposalCount).toEqual(proposalCount);
//
//     // Ensure members were not changed
//     const currentMembers = await dock.techCommittee.getTechComitteeMembers();
//     expect(currentMembers.length).toEqual(committeeMembers.length);
//   }, 320000);
//
//   afterAll(async () => {
//     await dock.disconnect();
//   }, 10000);
// });
//
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
//   }, 320000);
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
//   }, 320000);
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
//     // Get proposals hash and index
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
//   }, 320000);
//
//   afterAll(async () => {
//     await dock.disconnect();
//   }, 10000);
// });
