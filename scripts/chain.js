import ganache from 'ganache';
import memdown from 'memdown';
const server = ganache.server({ database: { db: memdown() }, chain: { chainId: 31337, hardfork: 'shanghai' }, wallet: { totalAccounts: 10, defaultBalance: 1000 }, logging: { quiet: true } });
await server.listen(8545, '127.0.0.1');
console.log('CampusVote local chain: http://127.0.0.1:8545 | Chain ID: 31337');
console.log('LOCAL TEST ACCOUNTS ONLY — never send real funds to these accounts.');
Object.entries(server.provider.getInitialAccounts()).forEach(([address, account], index) => console.log(`Account ${index}: ${address}\nImport key: ${account.secretKey}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
