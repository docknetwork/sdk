import { u8aToHex } from '@polkadot/util';
import { encodeExtrinsicAsHash } from '../utils/misc';

// TODO: typedefs and docstrings
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

  getProposalHash(tx) {
    return encodeExtrinsicAsHash(this.api, tx);
  }

  async execute(proposal, lengthBound = 1000, waitForFinalization = true) {
    const tx = this.api.tx.council.execute(this.api.createType('Call', proposal), lengthBound);
    await this.signAndSend(tx, waitForFinalization);
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
    return result.map((proposalu8a) => u8aToHex(proposalu8a).toString());
  }

  async getProposalDetails(proposalHash) {
    return await this.api.query.council.proposalOf(proposalHash);
  }

  async getProposalIndex(proposalHash) {
    const result = (await this.api.query.council.voting(proposalHash)).toJSON();
    return result && result.index;
  }

  async getMembers() {
    return await this.api.query.council.members();
  }

  addMember(who) {
    return this.api.tx.councilMembership.addMember(who);
  }

  removeMember(who) {
    return this.api.tx.councilMembership.removeMember(who);
  }
}
