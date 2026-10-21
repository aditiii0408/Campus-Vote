import fs from 'node:fs';
import solc from 'solc';
export function compile() {
  const source = fs.readFileSync(new URL('../contracts/CampusVote.sol', import.meta.url), 'utf8');
  const result = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'CampusVote.sol': { content: source } }, settings: { evmVersion: 'shanghai', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
  const errors = result.errors?.filter(e => e.severity === 'error');
  if (errors?.length) throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  return result.contracts['CampusVote.sol'].CampusVote;
}
