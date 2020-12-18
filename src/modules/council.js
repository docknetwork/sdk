import { u8aToHex } from '@polkadot/util';

// TODO: perhaps rename to DemoracyModule and add all methods?
// will see how many we need
export default class CouncilModule {
  /**
   * Creates a new instance of CouncilModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.signAndSend = signAndSend;
  }

  async makeProposal(call, threshold = 2, lengthBound = 1000, waitForFinalization = true) {
    const proposal = this.api.createType('Call', call);
    const tx = this.api.tx.council.propose(threshold, proposal, lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async vote(proposalHash, index, approve = false, waitForFinalization = true) {
    const tx = this.api.tx.council.vote(proposalHash, index, approve);
    await this.signAndSend(tx, waitForFinalization);
  }

  async disapproveProposal(proposalHash, waitForFinalization = true) {
    const tx = this.api.tx.council.disapproveProposal(proposalHash);
    await this.signAndSend(tx, waitForFinalization);
  }

  async closeProposal(proposalHash, index, proposalWeightBound = 1000000000, lengthBound = 1000, waitForFinalization = true) {
    const tx = this.api.tx.council.close(proposalHash, index, proposalWeightBound, lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async getOpenProposalCount() {
    const result = await this.api.query.council.proposals();
    return result.length;
  }

  async getProposalCount() {
    const result = await this.api.query.council.proposalCount();
    return result.toNumber();
  }

  async getProposals() {
    const result = await this.api.query.council.proposals();
    return result.map(proposalu8a => u8aToHex(proposalu8a).toString());
  }

  async getProposalDetails(proposalHash) {
    const result = await this.api.query.council.proposalOf(proposalHash);
    return result; // TODO: map into a proposal class?
  }

  async getProposalIndex(proposalHash) {
    const result = (await this.api.query.council.voting(proposalHash)).toJSON();
    return result.index;
  }

  // TODO: evulate if we need these below methods

  async getTechComitteeMembers() {
    const result = await this.api.query.technicalCommitteeMembership.members();
    return result;
  }

  async getMembers() {
    const result = await this.api.query.council.members();
    return result;
  }

  addTechCommitteeMember(who) {
    return this.api.tx.technicalCommitteeMembership.addMember(who);
  }

  removeTechCommitteeMember(who) {
    return this.api.tx.technicalCommitteeMembership.removeMember(who);
  }

  addMember(who) {
    return this.api.tx.councilMembership.addMember(who);
  }

  removeMember(who) {
    return this.api.tx.councilMembership.removeMember(who);
  }
}
