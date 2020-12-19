import { u8aToHex } from '@polkadot/util';

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

  async closeTechComitteeProposal(proposalHash, index, proposalWeightBound = 1000000000, lengthBound = 1000, waitForFinalization = true) {
    const tx = this.api.tx.technicalCommittee.close(proposalHash, index, proposalWeightBound, lengthBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async getTechComitteeProposalIndex(proposalHash) {
    const result = (await this.api.query.technicalCommittee.voting(proposalHash)).toJSON();
    return result.index;
  }

  async getTechComitteeProposals() {
    const result = await this.api.query.technicalCommittee.proposals();
    return result.map(proposalu8a => u8aToHex(proposalu8a).toString());
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

  async getTechComitteeMembers() {
    const result = await this.api.query.technicalCommitteeMembership.members();
    return result;
  }

  addTechCommitteeMember(who) {
    return this.api.tx.technicalCommitteeMembership.addMember(who);
  }

  removeTechCommitteeMember(who) {
    return this.api.tx.technicalCommitteeMembership.removeMember(who);
  }
}
