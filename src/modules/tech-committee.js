import { u8aToHex } from '@polkadot/util';

// TODO: typedefs and docstrings
export default class TechCommitteeModule {
  /**
   * Creates a new instance of TechCommitteeModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.signAndSend = signAndSend;
  }

  async closeProposal(proposalHash, index, proposalWeightBound = 1000000000, lengthBound = 1000, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.close(proposalHash, index, proposalWeightBound, lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async getProposalIndex(proposalHash) {
    const result = (await this.api.query.technicalCommittee.voting(proposalHash)).toJSON();
    return result && result.index;
  }

  async getProposals() {
    const result = await this.api.query.technicalCommittee.proposals();
    return result.map((proposalu8a) => u8aToHex(proposalu8a).toString());
  }

  async vote(proposalHash, index, approve = false, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.vote(proposalHash, index, approve);
    await this.signAndSend(tx, waitForFinalization);
  }

  async makeTechCommitteeProposal(call, threshold = 2, lengthBound = 1000, waitForFinalization = true) {
    const proposal = this.api.createType('Call', call);
    const tx = this.api.tx.technicalCommittee.propose(threshold, proposal, lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async disapproveProposal(proposalHash, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.disapproveProposal(proposalHash);
    await this.signAndSend(tx, waitForFinalization);
  }

  async execute(proposal, lengthBound = 1000, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.execute(this.api.createType('Call', proposal), lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async propose(threshold, proposal, lengthBound = 1000, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.propose(threshold, this.api.createType('Call', proposal), lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async setMembers(newMembers, prime, oldCount, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.setMembers(newMembers, prime, oldCount);
    await this.signAndSend(tx, waitForFinalization);
  }

  async getMembers() {
    return await this.api.query.technicalCommittee.members();
  }

  async getPrime() {
    return await this.api.query.technicalCommittee.prime();
  }

  async getProposalCount() {
    return await this.api.query.technicalCommittee.proposalCount();
  }

  async proposalOf(hash) {
    const result = await this.api.query.technicalCommittee.proposalOf(hash);
    return result.toJSON();
  }

  addTechCommitteeMember(who) {
    return this.api.tx.technicalCommitteeMembership.addMember(who);
  }

  removeTechCommitteeMember(who) {
    return this.api.tx.technicalCommitteeMembership.removeMember(who);
  }
}
