# Setup and wallet guide

## Requirements

- Node.js **22.12 or newer** and npm.
- Git to clone the repository.
- A browser with [MetaMask](https://metamask.io/) for blockchain voting.
- Three terminal tabs opened in the project directory.

No database, backend API, environment variables, paid service, testnet faucet, or real ETH are required.

## 1. Install

```sh
git clone https://github.com/asadullah098/CampusVote.git
cd CampusVote
npm install
```

## 2. Start the local blockchain

Terminal 1:

```sh
npm run chain
```

Keep it running. The node listens at `http://127.0.0.1:8545`, uses chain ID `31337`, and prints ten funded test accounts with their import keys. Account **0** is the deployment account and election owner. Each account starts with 1,000 local test ETH.

**Use printed keys only for this local demo. Never send real funds to these accounts or reuse their keys on public networks.**

## 3. Deploy the contract

Terminal 2, after the node starts:

```sh
npm run deploy
```

This compiles `contracts/CampusVote.sol`, deploys it with account 0, and generates `public/deployment.json` with the address and ABI. This session-specific file is ignored by Git; it contains no private keys.

## 4. Start the frontend

Terminal 3:

```sh
npm run dev
```

Open Vite's printed URL, normally **http://127.0.0.1:5173**. Reload after deployment. You can also run the frontend alone to try the clearly labeled wallet-free preview; preview votes are simulated and reset on page reload.

## 5. Configure MetaMask

1. Install MetaMask from its [official website](https://metamask.io/) in the browser where you will open CampusVote. Create a separate wallet for testing.
2. Choose **Add account → Import account → Private key** in MetaMask; labels may vary with the extension version.
3. Import one **Import key** printed by `npm run chain`. Use account 1 for a regular voter, or account 0 for owner controls.
4. Click **Connect wallet** in CampusVote and approve the network and account requests. The app can add the local network automatically.
5. If configuring it manually, use:

| Field | Value |
| --- | --- |
| Network name | CampusVote Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | `ETH` |
| Block explorer | Leave blank |

The imported account already has test ETH. There is nothing to buy. Official reference: [MetaMask custom networks](https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc).

## 6. Vote and verify

1. Select a candidate and click **Cast my vote**.
2. Click **Confirm vote**, then approve the transaction in MetaMask.
3. Wait for the receipt showing its transaction hash and confirmation block.
4. Open Results and inspect On-chain activity. Data refreshes every six seconds.
5. Reload and reconnect the same account to demonstrate that a second vote is prevented.
6. Import another printed account, switch to it, and reconnect to demonstrate a different voter.
7. Connect account 0 to use the owner-only close/reopen controls under On-chain activity. The contract rejects votes while the election is closed.

## Restart or reset

The local node stores state in memory. Stopping it removes contracts, votes, and accounts. After restarting:

1. Run `npm run chain`.
2. Run `npm run deploy` again.
3. Import an account from the new node output into MetaMask.
4. Reload the app and reconnect.

To create a fresh election without restarting the node, deploy again and reload. The previous contract remains on that chain, while the app uses the latest generated deployment file.

## Verification and production build

```sh
npm test
npm run build
npm run preview
```

Contract tests use an isolated chain and do not need the main node. `build` generates `dist/`; `preview` serves it locally. Deploy **before building** to include the current local contract configuration in the built frontend.

### Optional browser checks

Requires Google Chrome. With the frontend running:

```sh
node tests/browser-check.js
```

This checks preview voting, duplicate-vote UI prevention, results, setup, mobile overflow, and missing-wallet feedback. It defaults to port 5173 and saves screenshots in `artifacts/`.

For actual local transactions, first start the node and deploy a **fresh contract**, then run:

```sh
node tests/wallet-check.js
```

The wallet check defaults to port 5174 and uses an injected test provider; it does not automate MetaMask's approval screens. Run it once per fresh deployment because its voter can only vote once. Override the URL for either check:

```powershell
# PowerShell
$env:APP_URL = 'http://127.0.0.1:5173'
node tests/wallet-check.js
```

```sh
# macOS / Linux
APP_URL=http://127.0.0.1:5173 node tests/wallet-check.js
```

## Troubleshooting

| Problem | Solution |
| --- | --- |
| MetaMask not detected | Use the browser where its extension is installed and enabled. |
| Node unavailable | Start `npm run chain` and keep it open. App and node must run on the same computer. |
| Contract missing / not deployed | Run `npm run deploy` and reload. Repeat after every node restart. |
| Insufficient funds | Import a funded account from the current chain output; a newly created MetaMask account is not automatically funded. |
| Wrong network | Select CampusVote Local (chain ID 31337) and reconnect. |
| Stale nonce after node restart | Import a fresh test account. If needed, clear local test-account activity in MetaMask's advanced settings. |
| Port 8545 in use | Stop the previous local node before starting another. |
| Vite chooses another port | Open its printed URL; set `APP_URL` for browser checks. |
| Ganache µWS compatibility warning | Its Node.js fallback activates automatically; the local demo still works. |
| npm audit advisories | Ganache includes legacy bundled dependencies. Keep this demo localhost-only; avoid blind forced upgrades. |
| Fonts unavailable offline | System fonts are used automatically. |

## Scope

One wallet is not one verified student. Addresses and candidate choices are public. This project does not provide identity verification, a secret ballot, Sybil resistance, or production election security.
