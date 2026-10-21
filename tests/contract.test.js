import { test } from 'node:test';
import assert from 'node:assert/strict';
import ganache from 'ganache';
import memdown from 'memdown';
import { BrowserProvider, ContractFactory } from 'ethers';
import { compile } from '../scripts/compile.js';
test('election enforces voting rules and owner permissions', async () => {
  const node = ganache.provider({database:{db:memdown()},logging:{quiet:true},chain:{hardfork:'shanghai'}});
  const provider = new BrowserProvider(node);
  try {
    const owner = await provider.getSigner(0), voter = await provider.getSigner(1), other = await provider.getSigner(2);
    const artifact = compile();
    const contract = await new ContractFactory(artifact.abi,artifact.evm.bytecode.object,owner).deploy();
    await contract.waitForDeployment();
    await assert.rejects(contract.connect(voter).vote.staticCall(3));
    await (await contract.connect(voter).vote(1)).wait();
    assert.equal(await contract.votes(1),1n); assert.equal(await contract.totalVotes(),1n);
    assert.equal(await contract.hasVoted(await voter.getAddress()),true);
    await assert.rejects(contract.connect(voter).vote.staticCall(0));
    await assert.rejects(contract.connect(other).setElectionOpen.staticCall(false));
    await (await contract.setElectionOpen(false)).wait();
    await assert.rejects(contract.connect(other).vote.staticCall(0));
    await (await contract.setElectionOpen(true)).wait();
    await (await contract.connect(other).vote(0)).wait();
    assert.equal(await contract.totalVotes(),2n);
    const events = await contract.queryFilter(contract.filters.VoteCast());
    assert.equal(events.length,2); assert.equal(events[0].args.candidateId,1n);
  } finally { provider.destroy(); await node.disconnect(); }
});
