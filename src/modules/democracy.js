export default class DemocracyModule {
  /**
   * Creates a new instance of DemocracyModule and sets the api
   * @constructor
   * @param {object} api - PolkadotJS API Reference
   */
  constructor(api, signAndSend) {
    this.api = api;
    this.signAndSend = signAndSend;
  }

  async cancelQueued(referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.democracy.cancelQueued(referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async cancelReferendum(referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.sudo.sudo(
      this.api.tx.democracy.cancelReferendum(referendumIndex)
    );
    await this.signAndSend(tx, waitForFinalization);
  }

  async cancelProposal(proposalIndex, waitForFinalization = true) {
    const tx = this.api.tx.democracy.cancelProposal(proposalIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async clearPublicProposals(waitForFinalization = true) {
    const tx = this.api.tx.democracy.clearPublicProposals();
    await this.signAndSend(tx, waitForFinalization);
  }

  async enactProposal(proposalHash, referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.democracy.enactProposal(proposalHash, referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async enactProposal(proposalHash, referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.democracy.enactProposal(proposalHash, referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async notePreimage(encodedProposal, waitForFinalization = true) {
    const tx = this.api.tx.democracy.notePreimage(encodedProposal);
    await this.signAndSend(tx, waitForFinalization);
  }

  async notePreimageOperational(encodedProposal, waitForFinalization = true) {
    const tx = this.api.tx.democracy.notePreimageOperational(encodedProposal);
    await this.signAndSend(tx, waitForFinalization);
  }

  async propose(proposalHash, value = 0, waitForFinalization = true) {
    const tx = this.api.tx.democracy.propose(proposalHash, value);
    await this.signAndSend(tx, waitForFinalization);
  }

  async reapPreimage(proposalHash, proposalLenUpperBound, waitForFinalization = true) {
    const tx = this.api.tx.democracy.reapPreimage(proposalHash, proposalLenUpperBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async removeOtherVote(address, referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.democracy.removeOtherVote(address, referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async removeVote(referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.democracy.removeVote(referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async second(proposalIndex, secondsUpperBound, waitForFinalization = true) {
    const tx = this.api.tx.democracy.second(proposalIndex, secondsUpperBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async vote(referendumIndex, vote, waitForFinalization = true) {
    const tx = this.api.tx.democracy.vote(referendumIndex, vote);
    await this.signAndSend(tx, waitForFinalization);
  }

  async getReferendumCount() {
    const result = await this.api.query.forkedDemocracy.referendumCount();
    return result.toNumber();
  }

  async getReferendumStatus(referendumIndex = 0) {
    const result = await this.api.query.forkedDemocracy.referendumInfoOf(referendumIndex);
    return result.toJSON();
  }

  async getNextExternal() {
    const result = await this.api.query.forkedDemocracy.nextExternal();
    return result.isNone ? null : result;
  }

  fastTrack(proposalHash, votingPeriod = 3, delay = 1) {
    return this.api.tx.democracy.fastTrack(proposalHash, votingPeriod, delay);
  }

  councilPropose(tx) {
    return this.api.tx.democracy.councilPropose(typeof tx === 'string' ? tx : this.getProposalHash(tx));
  }
}
