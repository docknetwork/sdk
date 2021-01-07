/*
  NOTE: These tests are currently disabled, they all run individually but not sequentially. They also take a long time, and require a custom node as of now.
*/
// import dock from '../../src/api';
// import { randomAsHex, blake2AsHex } from '@polkadot/util-crypto';
//
// import { FullNodeEndpoint, TestKeyringOpts, TestAccountURI } from '../test-constants';
//
// // TODO: adjust these, tests take forever - i think we can do better with different node values
// const REFERENDUM_PROGRESS_WAIT = 50000; // 50 seconds
// const REFERENDUM_FINISH_WAIT = 90000; // 90 seconds
// const PROPOSAL_PROGRESS_WAIT = 20000; // 20 seconds
// const DEMOCRACY_MIN_DEPOSIT = 10000 * 1000000; // 10K tokens
//
// const councilMemberUris = [
//   '//Alice//stash',
//   '//Bob//stash',
//   '//Charlie',
// ];
//
// const TechCommitteeMemberUris = [
//   '//Dave',
//   '//Charlie',
//   '//Eve',
// ];
//
// async function setBalance(address, newBalance = 1000000000) {
//   dock.setAccount(dock.keyring.addFromUri('//Alice'));
//   const setBalanceTx = dock.api.tx.balances.setBalance(address, newBalance, 0);
//   await dock.signAndSend(dock.api.tx.sudo.sudo(setBalanceTx));
// }
//
// async function getBalanceOf(address) {
//   const { data } = await dock.api.query.system.account(address);
//   return {
//     free: data.free.toNumber(),
//     reserved: data.reserved.toNumber(),
//   };
// }
//
// async function connectAndInit() {
//   if (!dock.isConnected) {
//     await dock.init({
//       keyring: TestKeyringOpts,
//       address: FullNodeEndpoint,
//     });
//     await setBalance(dock.keyring.addFromUri(councilMemberUris[2]).address);
//   }
// }
//
// async function councilVotesAndConcludes(proposalHash, propTxAsHex, referendumIndex) {
//   // Member 1 approves
//   dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
//   await dock.council.execute(dock.democracy.vote(referendumIndex, true));
//
//   // Member 2 disapproves
//   dock.setAccount(dock.keyring.addFromUri(councilMemberUris[1]));
//   await dock.council.execute(dock.democracy.vote(referendumIndex, false));
//
//   // Ensure votes went through
//   let status = await dock.democracy.getReferendumStatus(referendumIndex);
//   expect(status).toMatchObject(
//     expect.objectContaining({
//       Ongoing: expect.objectContaining({
//         tally: { ayes: 1, nays: 1, turnout: 0 }
//       })
//     }),
//   );
//
//   // Last member approves
//   dock.setAccount(dock.keyring.addFromUri(councilMemberUris[2]));
//   await dock.council.execute(dock.democracy.vote(referendumIndex, true));
//
//   // Ensure last vote went through
//   status = await dock.democracy.getReferendumStatus(referendumIndex);
//   expect(status).toMatchObject(
//     expect.objectContaining({
//       Ongoing: expect.objectContaining({
//
//         tally: { ayes: 2, nays: 1, turnout: 0 }
//       })
//     }),
//   );
//
//   // Ensure no preimage, then note it, then ensure its set
//   expect(await dock.democracy.getPreimage(proposalHash)).toEqual(null);
//   await dock.democracy.notePreimage(propTxAsHex);
//   expect(await dock.democracy.getPreimage(proposalHash)).not.toEqual(null);
//
//   // Wait for referendum to finish
//   await new Promise((r) => setTimeout(r, REFERENDUM_FINISH_WAIT));
//
//   // Ensure it finished
//   status = await dock.democracy.getReferendumStatus(referendumIndex);
//   expect(status).toMatchObject(
//     expect.objectContaining({
//       Finished: expect.objectContaining({
//         approved: true,
//         end: expect.any(Number)
//       }),
//     }),
//   );
// }
//
// async function concludeProposal(proposalBlakeHash, propTxAsHex) {
//   // Get current referendum count
//   const currentRefCount = await dock.democracy.getReferendumCount();
//
//   // Wait for referendum to process
//   await new Promise((r) => setTimeout(r, 125000));
//
//   // Ensure referendum was set
//   expect(await dock.democracy.getReferendumCount()).toEqual(currentRefCount + 1);
//
//   // Check referendum status
//   const status = await dock.democracy.getReferendumStatus(currentRefCount);
//   expect(status).toMatchObject(
//     expect.objectContaining({
//       Ongoing: {
//         end: expect.any(Number),
//         proposalHash: proposalBlakeHash,
//         threshold: 'Simplemajority',
//         delay: expect.any(Number),
//         tally: { ayes: 0, nays: 0, turnout: 0 }
//       }
//     }),
//   );
//
//   await councilVotesAndConcludes(proposalBlakeHash, propTxAsHex, currentRefCount)
// }
//
// describe('Proposal proposing', () => {
//   let proposer = '//Charlie';
//   let backer_1 = '//Eve';
//   let backer_2 = '//Ferdie';
//
//   beforeAll(async (done) => {
//     await connectAndInit();
//
//     // Give proposer and backer balance
//     await setBalance(dock.keyring.addFromUri(proposer).address, DEMOCRACY_MIN_DEPOSIT * 10);
//     await setBalance(dock.keyring.addFromUri(backer_1).address, DEMOCRACY_MIN_DEPOSIT * 10);
//     await setBalance(dock.keyring.addFromUri(backer_2).address, DEMOCRACY_MIN_DEPOSIT * 10);
//
//     done();
//   }, 320000);
//
//   test('Rejection of proposal', async () => {
//     const currentPublicProposalCount = await dock.democracy.getPublicProposalCount();
//     const councilMembers = await dock.council.getMembers();
//     expect(councilMembers.length).toEqual(3); // Ensure we have default council members
//
//     const giveBalanceAddress = dock.keyring.addFromUri(randomAsHex(32)).address;
//
//     // Create set balance root extrinsic to propose
//     const newBalance = 10000000000;
//     const rootAction = dock.api.tx.balances.setBalance(giveBalanceAddress, newBalance, 0);
//
//     // Get root action proposal hash
//     const balanceSetPropHash = dock.council.getProposalHash(rootAction);
//     const referendumIndex = 0;
//
//     expect((await getBalanceOf(dock.keyring.addFromUri(proposer).address)).reserved).toEqual(0);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_1).address)).reserved).toEqual(0);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_2).address)).reserved).toEqual(0);
//
//     // Public proposal backed by 2 more accounts
//     dock.setAccount(dock.keyring.addFromUri(proposer));
//     await dock.democracy.propose(balanceSetPropHash, DEMOCRACY_MIN_DEPOSIT);
//     dock.setAccount(dock.keyring.addFromUri(backer_1));
//     await dock.democracy.second(referendumIndex, 10);
//     dock.setAccount(dock.keyring.addFromUri(backer_2));
//     await dock.democracy.second(referendumIndex, 10);
//
//     // Ensure proposal was added
//     expect(await dock.democracy.getPublicProposalCount()).toEqual(currentPublicProposalCount + 1);
//
//     // Proposer's and backers' free balance decreases and that balance is reserved.
//     expect((await getBalanceOf(dock.keyring.addFromUri(proposer).address)).reserved).toEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_1).address)).reserved).toEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_2).address)).reserved).toEqual(DEMOCRACY_MIN_DEPOSIT);
//
//     const { addresses, balance } = await dock.democracy.getDepositOf(referendumIndex);
//     expect(addresses.length).toEqual(3);
//     expect(balance).toEqual(DEMOCRACY_MIN_DEPOSIT);
//
//     const treasuryBalance = await dock.api.rpc.poa.treasuryBalance();
//     const propIndex = currentPublicProposalCount;
//
//     // Non council member cannot cancel the proposal
//     dock.setAccount(dock.keyring.addFromUri(backer_2));
//     await expect(
//       dock.signAndSend(dock.democracy.cancelProposal(propIndex)),
//     ).rejects.toThrow();
//     expect(await dock.democracy.getPublicProposalCount()).toEqual(currentPublicProposalCount + 1);
//
//     // Council member cancels the proposal
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
//     await dock.council.execute(dock.democracy.cancelProposal(propIndex));
//     expect(await dock.democracy.getPublicProposalCount()).toEqual(currentPublicProposalCount);
//
//     // Proposer's and backers' balance is slashed and treasury is credited
//     expect(await dock.democracy.getDepositOf(referendumIndex)).toEqual(null);
//     expect((await getBalanceOf(dock.keyring.addFromUri(proposer).address)).reserved).toEqual(0); // TODO: store balance in variable so we dont fetch in below block
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_1).address)).reserved).toEqual(0);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_2).address)).reserved).toEqual(0);
//
//     // Ensure reserved balance is less than balance before (cant use 9 * DEMOCRACY_MIN_DEPOSIT because of fee values)
//     expect((await getBalanceOf(dock.keyring.addFromUri(proposer).address)).free).toBeLessThan(10 * DEMOCRACY_MIN_DEPOSIT);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_1).address)).free).toBeLessThan(10 * DEMOCRACY_MIN_DEPOSIT);
//     expect((await getBalanceOf(dock.keyring.addFromUri(backer_2).address)).free).toBeLessThan(10 * DEMOCRACY_MIN_DEPOSIT);
//     expect((await dock.api.rpc.poa.treasuryBalance()).toNumber()).toBeGreaterThan(treasuryBalance.toNumber());
//
//     // The proposal's intended change did not happen
//     expect((await getBalanceOf(giveBalanceAddress)).free).toEqual(0);
//   }, 320000);
//
//   test('Public proposes root action and accepts', async () => {
//     const proposer = dock.keyring.addFromUri(randomAsHex(32));
//     const backer = dock.keyring.addFromUri(randomAsHex(32));
//     const giveToAddr = dock.keyring.addFromUri(randomAsHex(32)).address;
//
//     // Create set balance root extrinsic to propose
//     const newBalance = 10000000000;
//     const rootAction = dock.api.tx.balances.setBalance(giveToAddr, newBalance, 0).toHex();
//
//     // Create proposal of council member
//     const councilPropHash = blake2AsHex(rootAction);
//
//     // Give some balance but less than `MinimumDeposit`
//     await setBalance(proposer.address, DEMOCRACY_MIN_DEPOSIT - (10 * 1000000));
//
//     // Ensure balance was set
//     const proposerBalance = await getBalanceOf(proposer.address);
//     expect(proposerBalance.free).toBeLessThan(DEMOCRACY_MIN_DEPOSIT);
//     expect(proposerBalance.reserved).toEqual(0);
//
//     // Proposing should fail
//     dock.setAccount(proposer);
//     await expect(dock.democracy.propose(councilPropHash, DEMOCRACY_MIN_DEPOSIT)).rejects.toThrow();
//
//     // Give some more balance to reach `MinimumDeposit`
//     await setBalance(proposer.address, DEMOCRACY_MIN_DEPOSIT * 2);
//     await setBalance(backer.address, DEMOCRACY_MIN_DEPOSIT * 2);
//
//     // Ensure balance is enough
//     expect((await getBalanceOf(proposer.address)).free).toBeGreaterThanOrEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect((await getBalanceOf(backer.address)).free).toBeGreaterThanOrEqual(DEMOCRACY_MIN_DEPOSIT);
//
//     // Proposing should work and proposer's balance should be reserved
//     dock.setAccount(proposer);
//     const lastPropCount = await dock.democracy.getPublicProposalCount();
//     await dock.democracy.propose(councilPropHash, DEMOCRACY_MIN_DEPOSIT);
//     expect(await dock.democracy.getPublicProposalCount()).toEqual(lastPropCount + 1);
//
//     // Second the proposal from the backer
//     dock.setAccount(backer);
//     await dock.democracy.second(lastPropCount, 10);
//
//     // Proposer and backer got their balance locked (reserved)
//     const newProposerBalance = await getBalanceOf(proposer.address);
//     const newBackerBalance = await getBalanceOf(backer.address);
//     expect(newProposerBalance.reserved).toEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect(newBackerBalance.reserved).toEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect(newProposerBalance.free).toBeLessThan(DEMOCRACY_MIN_DEPOSIT);
//     expect(newBackerBalance.free).toBeLessThan(DEMOCRACY_MIN_DEPOSIT);
//
//     // Conclude the proposal
//     await concludeProposal(councilPropHash, rootAction);
//
//     // Proposer and backer got their balance back (unreserve
//     const finalProposerBalance = await getBalanceOf(proposer.address);
//     const finalBackerBalance = await getBalanceOf(backer.address);
//     expect(finalProposerBalance.free).toBeGreaterThanOrEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect(finalBackerBalance.free).toBeGreaterThanOrEqual(DEMOCRACY_MIN_DEPOSIT);
//     expect(finalProposerBalance.reserved).toEqual(0);
//     expect(finalBackerBalance.reserved).toEqual(0);
//   }, 320000);
//
//   test('Council proposes root action and accepts', async () => {
//     expect(await dock.democracy.getNextExternal()).toEqual(null);
//
//     const giveToAddr = dock.keyring.addFromUri(randomAsHex(32)).address;
//
//     // Create set balance root extrinsic to propose
//     const newBalance = 10000000000;
//     const rootAction = dock.api.tx.balances.setBalance(giveToAddr, newBalance, 0).toHex();
//
//     // Create proposal of council member
//     const councilPropHash = blake2AsHex(rootAction);
//     const councilProposal = dock.democracy.councilPropose(councilPropHash);
//
//     // Must propose as council member
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
//     await dock.council.execute(councilProposal);
//
//     // Ensure external proposal was added
//     expect(await dock.democracy.getNextExternal()).not.toEqual(null);
//
//     // Conclude the proposal
//     await concludeProposal(councilPropHash, rootAction);
//   }, 320000);
//
//   afterAll(async () => {
//     await dock.disconnect();
//   }, 10000);
// });
//
// describe('Tech-committee', () => {
//   let newMemberAccount;
//
//   beforeAll(async (done) => {
//     await connectAndInit();
//
//     // Create new council member account with balance
//     newMemberAccount = dock.keyring.addFromUri(randomAsHex(32));
//     await setBalance(newMemberAccount.address);
//     await setBalance(dock.keyring.addFromUri(TechCommitteeMemberUris[0]).address);
//     await setBalance(dock.keyring.addFromUri(TechCommitteeMemberUris[1]).address);
//     await setBalance(dock.keyring.addFromUri(TechCommitteeMemberUris[2]).address);
//
//     done();
//   }, 320000);
//
//   // TODO: fix this test fails when council tests are also ran (below describe block)
//   test('Tech committee fast tracks', async () => {
//     // Get current members and proposal count
//     const councilMembers = await dock.council.getMembers();
//     expect(councilMembers.length).toEqual(3); // Ensure we have default council members
//
//     // Get current members and proposal count
//     const members = await dock.techCommittee.getMembers();
//     expect(members.length).toEqual(3); // Ensure we have default commitee members
//
//     // Create set balance root extrinsic to propose
//     const rootAction = dock.api.tx.balances.setBalance(dock.keyring.addFromUri(councilMemberUris[2]).address, 10000000000, 0); // TODO: do we need the extra stuff in set_balance_proposal_hash_and_note?
//
//     // Create proposal of council member
//     const councilPropHash = dock.council.getProposalHash(rootAction);
//     const councilProposal = dock.democracy.councilPropose(councilPropHash);
//
//     // Execute as council member
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
//     await dock.council.execute(councilProposal);
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
//     const techProposals = await dock.techCommittee.getProposals();
//     expect(techProposals.length).toBeGreaterThan(0);
//
//     // Get proposal hash and index
//     const proposalHash = techProposals[techProposals.length - 1];
//     const proposalIndex = await dock.techCommittee.getProposalIndex(proposalHash);
//
//     // Member 2 approves
//     dock.setAccount(dock.keyring.addFromUri(TechCommitteeMemberUris[1]));
//     await dock.techCommittee.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposal
//     await dock.techCommittee.closeProposal(proposalHash, proposalIndex);
//
//     // Wait for referendum to process
//     await new Promise((r) => setTimeout(r, REFERENDUM_PROGRESS_WAIT));
//
//     // Ensure referendum was added
//     const status = await dock.democracy.getReferendumStatus(currentRefCount);
//     expect(await dock.democracy.getReferendumCount()).toEqual(currentRefCount + 1);
//
//     // Check referendum status
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[2]));
//
//     // Get current members and proposal count
//     const members = await dock.techCommittee.getMembers();
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[1]));
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure new member was added
//     newMembers = await dock.techCommittee.getMembers();
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[2]));
//     await dock.council.makeProposal(proposalToRemove, 3);
//
//     // Get proposals
//     proposals = await dock.council.getProposals();
//     proposalHash = proposals[proposals.length - 1];
//     proposalIndex = await dock.council.getProposalIndex(proposalHash);
//
//     // Create approval vote from council member 1
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Create approval vote from new committee member
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[1]));
//     await dock.council.vote(proposalHash, proposalIndex, true);
//
//     // Any account can then close the proposal
//     await dock.council.closeProposal(proposalHash, proposalIndex);
//
//     // Ensure new member was removed
//     newMembers = await dock.techCommittee.getMembers();
//     expect(newMembers.length).toBe(members.length);
//   }, 320000);
//
//   test('Change tech-committee membership (rejected)', async () => {
//     // Create proposal from 3rd council member
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[2]));
//
//      // Ensure we have default commitee members
//     const committeeMembers = await dock.techCommittee.getMembers();
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[1]));
//     await dock.council.vote(proposalHash, proposalIndex, false);
//
//     // Create rejection vote from council member 1
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
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
//     const currentMembers = await dock.techCommittee.getMembers();
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
//     await setBalance(newMemberAccount.address);
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[1]));
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[0]));
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
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[1]));
//     await dock.council.vote(proposalHash, proposalIndex, false);
//
//     // Create rejection vote from council member 3
//     dock.setAccount(dock.keyring.addFromUri(councilMemberUris[2]));
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
