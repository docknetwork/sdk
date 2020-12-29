// TODO: typedefs and docstrings
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
    const tx = this.api.tx.simpleDemocracy.cancelQueued(referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async cancelReferendum(referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.sudo.sudo(
      this.api.tx.simpleDemocracy.cancelReferendum(referendumIndex)
    );
    await this.signAndSend(tx, waitForFinalization);
  }

  async clearPublicProposals(waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.clearPublicProposals();
    await this.signAndSend(tx, waitForFinalization);
  }

  async enactProposal(proposalHash, referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.enactProposal(proposalHash, referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async enactProposal(proposalHash, referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.enactProposal(proposalHash, referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async notePreimage(call, waitForFinalization = true) {
    // const proposal = this.api.createType('Call', call);
    // const tx = this.api.tx.simpleDemocracy.notePreimage(call.toHex());
    const tx = this.api.tx.simpleDemocracy.notePreimage(call);
    await this.signAndSend(tx, waitForFinalization);
  }

  async notePreimageOperational(encodedProposal, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.notePreimageOperational(encodedProposal);
    await this.signAndSend(tx, waitForFinalization);
  }

  async propose(proposalHash, value = 0, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.propose(proposalHash, value);
    await this.signAndSend(tx, waitForFinalization);
  }

  async reapPreimage(proposalHash, proposalLenUpperBound, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.reapPreimage(proposalHash, proposalLenUpperBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  async removeOtherVote(address, referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.removeOtherVote(address, referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async removeVote(referendumIndex, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.removeVote(referendumIndex);
    await this.signAndSend(tx, waitForFinalization);
  }

  async second(proposalIndex, secondsUpperBound, waitForFinalization = true) {
    const tx = this.api.tx.simpleDemocracy.second(proposalIndex, secondsUpperBound);
    await this.signAndSend(tx, waitForFinalization);
  }

  vote(referendumIndex, vote, waitForFinalization = true) {
    return this.api.tx.simpleDemocracy.vote(referendumIndex, vote);
  }

  async getPreimage(proposalHash) {
    const result = await this.api.query.democracy.preimages(proposalHash);
    return result.isNone ? null : result;
  }

  async getDepositOf(referendumIndex) {
    const result = (await this.api.query.democracy.depositOf(referendumIndex)).toJSON();
    return (result && result.length) ? {
      addresses: result[0],
      balance: result[1],
    } : null;
  }

  async getPublicProposals() {
    const result = await this.api.query.democracy.publicProps();
    return result;
  }

  async getPublicProposalCount() {
    const result = await this.getPublicProposals();
    return result.length;
  }

  async getReferendumCount() {
    const result = await this.api.query.democracy.referendumCount();
    return result.toNumber();
  }

  async getReferendumStatus(referendumIndex = 0) {
    const result = await this.api.query.democracy.referendumInfoOf(referendumIndex);
    return result.toJSON();
  }

  async getNextExternal() {
    const result = await this.api.query.democracy.nextExternal();
    return result.isNone ? null : result;
  }

  async getBlacklist(hash) {
    const result = await this.api.query.democracy.blacklist(hash);
    return result.toJSON();
  }

  async getCancellations(hash) {
    const result = await this.api.query.democracy.cancellations(hash);
    return result;
  }

  async getLocks(address) {
    const result = await this.api.query.democracy.locks(address);
    return result;
  }

  async getVotesOf(address) {
    const result = await this.api.query.democracy.votingOf(address);
    return result.toJSON();
  }

  async getStorageVersion() {
    const result = await this.api.query.democracy.storageVersion();
    return result;
  }

  async getLowestUnbaked() {
    const result = await this.api.query.democracy.lowestUnbaked();
    return result;
  }

  async getLastTabledWasExternal() {
    const result = await this.api.query.democracy.lastTabledWasExternal();
    return result;
  }

  fastTrack(proposalHash, votingPeriod = 3, delay = 1) {
    return this.api.tx.simpleDemocracy.fastTrack(proposalHash, votingPeriod, delay);
  }

  councilPropose(proposalHash) {
    return this.api.tx.simpleDemocracy.councilPropose(proposalHash);
  }

  cancelProposal(propIndex) {
    return this.api.tx.simpleDemocracy.cancelProposal(propIndex);
  }
}
