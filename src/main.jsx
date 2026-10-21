import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserProvider, JsonRpcProvider, Contract } from 'ethers';
import { Vote, LayoutDashboard, BarChart3, BookOpen, ArrowUpRight, ArrowRight, ShieldCheck, Wallet, Check, CheckCircle2, Users, Radio, ExternalLink, RefreshCw, X, Copy, GraduationCap, Link2 } from 'lucide-react';
import './styles.css';

const candidates = [
  { name: 'Aarav Sharma', initials: 'AS', course: 'Computer Science · 3rd year', slogan: 'A campus that works for everyone.', points: ['Better student spaces', 'More tech & career opportunities'], color: 'blue' },
  { name: 'Meera Patel', initials: 'MP', course: 'Business Administration · 3rd year', slogan: 'Small changes. A stronger community.', points: ['Student wellbeing first', 'Clubs with more possibilities'], color: 'peach' },
  { name: 'Rohan Verma', initials: 'RV', course: 'Electronics · 3rd year', slogan: 'Your ideas. Our next chapter.', points: ['A greener, smarter campus', 'Transparent student funding'], color: 'purple' },
];
const short = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
function App() {
  const [page, setPage] = useState('Election');
  const [mode, setMode] = useState('preview');
  const [counts, setCounts] = useState([0, 0, 0]);
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [open, setOpen] = useState(true);
  const [account, setAccount] = useState('');
  const [owner, setOwner] = useState('');
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const total = counts.reduce((a,b) => a+b, 0);
  const errorText = e => e.code === 4001 || e.code === 'ACTION_REJECTED' ? 'Request cancelled in your wallet. You can try again.' : e.reason || e.shortMessage || e.message || 'Something went wrong. Please try again.';

  useEffect(() => { fetch('/deployment.json').then(r => r.json()).then(setConfig).catch(() => setConfig({})); }, []);
  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet?.on) return;
    const reset = () => { setAccount(''); setVoted(false); setOwner(''); setReceipt(null); setSelected(null); setMessage('Wallet changed. Connect again to continue.'); };
    wallet.on('accountsChanged', reset); wallet.on('chainChanged', reset);
    return () => { wallet.removeListener('accountsChanged', reset); wallet.removeListener('chainChanged', reset); };
  }, []);
  async function refresh(address = account) {
    if (!config?.address) throw new Error('Contract not deployed. Follow the Setup guide, then reload this page.');
    const provider = new JsonRpcProvider('http://127.0.0.1:8545', 31337, { staticNetwork: true });
    try {
      if (await provider.getCode(config.address) === '0x') throw new Error('Contract missing. Run npm run deploy again and reload this page.');
      const contract = new Contract(config.address, config.abi, provider);
      const [a,b,c,isOpen,admin,used,logs] = await Promise.all([contract.votes(0),contract.votes(1),contract.votes(2),contract.isOpen(),contract.owner(),address ? contract.hasVoted(address) : false,contract.queryFilter(contract.filters.VoteCast(), 0)]);
      setCounts([Number(a),Number(b),Number(c)]); setOpen(isOpen); setOwner(admin); setVoted(used); setConnected(true);
      setEvents(logs.slice(-6).reverse().map(e => ({ hash:e.transactionHash, voter:e.args[0], candidate:Number(e.args[1]), block:e.blockNumber })));
    } finally { provider.destroy(); }
  }
  useEffect(() => {
    if (mode !== 'blockchain' || !config) return;
    let cancelled = false;
    const update = () => refresh().catch(e => { if (!cancelled) { setConnected(false); setMessage(errorText(e)); } });
    update(); const timer = setInterval(update, 6000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [mode, config, account]);
  async function connect() {
    setMessage(''); setBusy(true);
    try {
      if (!window.ethereum) throw new Error('Install the MetaMask browser extension, then open this app in that browser. See Setup guide.');
      try { await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{ chainId:'0x7a69' }] }); }
      catch(e) { if (e.code !== 4902) throw e; await window.ethereum.request({ method:'wallet_addEthereumChain', params:[{ chainId:'0x7a69', chainName:'CampusVote Local', rpcUrls:['http://127.0.0.1:8545'], nativeCurrency:{name:'Test Ether',symbol:'ETH',decimals:18} }] }); }
      const accounts = await window.ethereum.request({method:'eth_requestAccounts'});
      await refresh(accounts[0]); setAccount(accounts[0]); setMode('blockchain'); setSelected(null); setReceipt(null);
    } catch(e) { setMessage(errorText(e)); } finally { setBusy(false); }
  }
  async function submit() {
    setConfirm(false); setBusy(true); setMessage('');
    try {
      if (mode === 'preview') { setCounts(old => old.map((n,i) => n + (i === selected ? 1 : 0))); setVoted(true); setReceipt({preview:true}); }
      else {
        const provider = new BrowserProvider(window.ethereum);
        if ((await provider.getNetwork()).chainId !== 31337n) throw new Error('Switch your wallet to CampusVote Local.');
        const signer = await provider.getSigner();
        if ((await signer.getAddress()).toLowerCase() !== account.toLowerCase()) throw new Error('Wallet changed. Please connect again.');
        const contract = new Contract(config.address,config.abi,signer);
        const tx = await contract.vote(selected); setMessage('Transaction submitted. Waiting for confirmation…');
        const result = await tx.wait(); setReceipt({hash:tx.hash, block:result.blockNumber}); await refresh();
      }
      setMessage('Your vote has been recorded successfully.');
    } catch(e) { setMessage(errorText(e)); } finally { setBusy(false); }
  }
  async function toggleElection() {
    setBusy(true); setMessage('');
    try { const provider = new BrowserProvider(window.ethereum); if ((await provider.getNetwork()).chainId !== 31337n) throw new Error('Switch to CampusVote Local.'); const signer = await provider.getSigner(); const tx = await new Contract(config.address,config.abi,signer).setElectionOpen(!open); await tx.wait(); await refresh(); } catch(e) { setMessage(errorText(e)); } finally { setBusy(false); }
  }
  function switchMode(value) { setMode(value); setCounts([0,0,0]); setVoted(false); setSelected(null); setReceipt(null); setMessage(''); setEvents([]); setConnected(false); }
  return <div className="app"><a className="skip-link" href="#main">Skip to main content</a>
    <aside className="sidebar"><a className="brand" href="#" onClick={e => {e.preventDefault();setPage('Election');}}><span className="brand-icon"><Vote size={25}/></span>Campus<span>Vote</span></a><div className="workspace-label">STUDENT GOVERNANCE</div><nav>{[['Election',LayoutDashboard],['Results',BarChart3],['Setup guide',BookOpen]].map(([label,Icon]) => <button key={label} className={page === label ? 'nav active':'nav'} onClick={() => setPage(label)}><Icon size={19}/>{label}{page === label && <span className="nav-dot"/>}</button>)}</nav><div className="sidebar-note"><ShieldCheck size={25}/><h3>Built on trust.</h3><p>Every vote is a transaction.<br/>Every result is verifiable.</p><span>POWERED BY ETHEREUM <ArrowUpRight size={13}/></span></div><div className="sidebar-bottom"><span className="college-icon"><GraduationCap size={20}/></span><div>Campus community<small>Blockchain mini project</small></div></div></aside>
    <div className="main-shell"><header><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div><div className="header-actions"><span className="network"><i/>{mode === 'preview' ? 'Preview mode' : 'Local Ethereum'}</span><button className="wallet-button" onClick={connect} disabled={busy}><Wallet size={16}/>{busy ? 'Please wait…' : account ? short(account) : 'Connect wallet'}</button></div></header>
    <main id="main"><div className="page-heading"><div><div className="eyebrow">YOUR CAMPUS. YOUR SAY.</div><h1>{page === 'Election' ? 'Good change starts with your vote.' : page === 'Results' ? 'Every voice, accounted for.' : 'From setup to your first vote.'}</h1><p>{page === 'Setup guide' ? 'A local blockchain. Test ETH. A few simple steps.' : 'A transparent, student-powered election. Make your voice count.'}</p></div><span className="edition">CAMPUS ELECTION <strong>01 / 2026</strong></span></div>
    <div className="mode-banner"><div><span className="preview-symbol"><Link2 size={17}/></span><p><strong>{mode === 'preview' ? 'Take it for a test vote.' : 'Connected to your local blockchain.'}</strong> {mode === 'preview' ? 'Preview is a simulation — no wallet or real transactions.' : 'Votes are stored in the deployed smart contract.'}</p></div><button onClick={() => { if(mode === 'preview') switchMode('blockchain'); else switchMode('preview'); }} disabled={busy}>{mode === 'preview' ? 'Use blockchain' : 'Switch to preview'} <ArrowRight size={15}/></button></div>
    {message && <div role="status" className="message">{message}<button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16}/></button></div>}
    {page === 'Setup guide' ? <section className="guide panel"><div className="section-title"><BookOpen size={20}/><h2>Your local demo, ready in minutes</h2></div>{[
      ['Install dependencies','Install Node.js 22 or later. In the project folder run:','npm install'],
      ['Start a local blockchain','Keep this terminal open. It prints funded test accounts and their import keys.','npm run chain'],
      ['Deploy the smart contract','In a second terminal, deploy the election. Repeat this after every chain restart.','npm run deploy'],
      ['Start the application','In a third terminal, run this command and open the URL it prints.','npm run dev'],
      ['Set up MetaMask','Install MetaMask from metamask.io in your browser. Create a separate test wallet. Add the local network below, or let Connect wallet add it automatically.','Network: CampusVote Local\nRPC URL: http://127.0.0.1:8545\nChain ID: 31337\nCurrency: ETH'],
      ['Import a funded test account','In MetaMask, choose Add account → Import account → Private key. Use one key printed by npm run chain. These accounts contain test ETH only.','Never use these local test keys for real funds.'],
      ['Connect and cast your vote','Reload this app after deployment. Click Connect wallet and approve the network and account requests. Select a candidate and confirm your transaction in MetaMask. Switch to another imported test account to demonstrate a second voter.',null]
    ].map(([title,desc,code],i) => <article className="guide-step" key={title}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{title}</h3><p>{desc}</p>{code && <pre>{code}</pre>}</div></article>)}<div className="notice"><ShieldCheck size={20}/><p><strong>Designed for learning.</strong> One wallet is not one verified student. Votes and wallet addresses are public. This demo does not provide ballot secrecy or Sybil resistance. Preview votes reset when you reload; blockchain votes persist until the local node stops.</p></div></section> : <>
    <section className="stats"><div><span className="stat-icon blue"><Vote size={22}/></span><div><small>Total votes cast</small><strong>{total.toLocaleString()} <span>{mode === 'preview' ? 'SIMULATED' : 'ON CHAIN'}</span></strong></div></div><div><span className="stat-icon purple"><Users size={22}/></span><div><small>Candidates</small><strong>03 <em>One shared future</em></strong></div></div><div><span className="stat-icon green"><ShieldCheck size={22}/></span><div><small>Your voting status</small><strong className="status-text">{voted ? 'Vote recorded' : 'Not voted yet'} <i className={voted ? 'green-dot':'gray-dot'}/></strong></div></div></section>
    <section className="election-banner"><div className="election-art" aria-hidden="true"><Vote size={59} strokeWidth={1.3}/><span className="art-check"><Check size={15}/></span></div><div><div className="election-meta"><span className={open ? 'live-badge':'closed-badge'}><i/>{open ? 'VOTING OPEN' : 'ELECTION CLOSED'}</span><span>STUDENT COUNCIL</span></div><h2>Student Council President</h2><p>Choose the voice that will represent your campus.</p></div><div className="election-detail"><span>THE RULE IS SIMPLE</span><strong>One wallet. One vote.</strong><small><ShieldCheck size={14}/> Enforced by the smart contract</small></div></section>
    <div className="content-grid"><section><div className="section-heading"><div><h2>{page === 'Results' ? 'Election results' : 'Meet your candidates'} <span>03</span></h2><p>{page === 'Results' ? 'Counts are refreshed every 6 seconds in blockchain mode.' : 'Different perspectives. A common purpose.'}</p></div>{page === 'Results' && <button className="text-button" onClick={() => mode === 'blockchain' ? refresh().catch(e => setMessage(errorText(e))) : setMessage('Preview results are already up to date.')}><RefreshCw size={15}/> Refresh</button>}</div>
    {page === 'Election' ? <div className="candidate-grid">{candidates.map((candidate,i) => <button key={candidate.name} className={`candidate ${selected === i ? 'selected':''}`} disabled={busy || voted || !open} aria-pressed={selected === i} onClick={() => setSelected(i)}><div className={`candidate-portrait ${candidate.color}`}><span className="candidate-number">0{i+1}</span><div className="avatar">{candidate.initials}</div><span className="portrait-lines"/><span className="selection-indicator">{selected === i && <Check size={14}/>}</span></div><div className="candidate-copy"><small>PRESIDENTIAL CANDIDATE</small><h3>{candidate.name}</h3><p className="course">{candidate.course}</p><p className="slogan">“{candidate.slogan}”</p><ul>{candidate.points.map(p => <li key={p}><Check size={13}/>{p}</li>)}</ul><div className="candidate-cta">{voted ? 'Voting complete' : selected === i ? 'Candidate selected' : 'Select candidate'}{selected === i ? <CheckCircle2 size={17}/> : <ArrowUpRight size={17}/>}</div></div></button>)}</div> : <div className="panel results-large">{candidates.map((c,i) => <div className="result-row" key={c.name}><div><span className={`mini-avatar ${c.color}`}>{c.initials}</span><strong>{c.name}</strong><b>{counts[i]} votes · {total ? Math.round(counts[i]/total*100) : 0}%</b></div><div className="track"><span style={{width:`${total ? counts[i]/total*100:0}%`}}/></div></div>)}{!total && <p className="empty-state">No votes yet. The first vote starts the story.</p>}</div>}
    {page === 'Election' && <div className="vote-action"><div><ShieldCheck size={20}/><p><strong>{voted ? 'Thank you for showing up.' : selected !== null ? `Ready to vote for ${candidates[selected].name}?` : 'Your choice makes a difference.'}</strong><small>{voted ? 'Your wallet has used its vote in this election.' : 'Select one candidate above to continue.'}</small></p></div><button className="primary" disabled={busy || voted || !open || selected === null || (mode === 'blockchain' && (!account || !connected))} onClick={() => setConfirm(true)}>{busy ? 'Confirming…' : voted ? 'Vote recorded' : 'Cast my vote'}{voted ? <Check size={17}/> : <ArrowRight size={17}/>}</button></div>}
    {receipt && <div className="receipt panel"><CheckCircle2 size={22}/><div><strong>{receipt.preview ? 'Preview vote recorded' : 'Transaction confirmed'}</strong><p>{receipt.preview ? 'This was a simulation. Switch to blockchain mode to record a real local transaction.' : `Block ${receipt.block}`}</p>{receipt.hash && <code>{receipt.hash}</code>}</div></div>}
    <div className="how-it-works"><h3>A better way to have your say.</h3><div>{[[Wallet,'Connect your wallet','Your wallet is your voting pass.'],[Vote,'Make your choice','One candidate. One transaction.'],[ShieldCheck,'Verify the result','Open results, recorded on chain.']].map(([Icon,title,desc],i) => <article key={title}><span className="step-icon"><Icon size={20}/></span><div><small>0{i+1}</small><h4>{title}</h4><p>{desc}</p></div></article>)}</div></div>
    </section><aside className="right-column"><section className="panel live-results"><div className="section-title"><h2>Live results</h2><span className="live-dot"><Radio size={13}/>{mode === 'preview' ? 'PREVIEW' : 'LIVE'}</span></div><p>A little transparency goes a long way.</p>{candidates.map((c,i) => <div className="result-row" key={c.name}><div><strong>{c.name}</strong><b>{total ? Math.round(counts[i]/total*100) : 0}%</b></div><div className={`track ${c.color}`}><span style={{width:`${total ? counts[i]/total*100 : 0}%`}}/></div><small>{counts[i]} {counts[i] === 1 ? 'vote':'votes'}</small></div>)}<button className="full-results" onClick={() => setPage(page === 'Results' ? 'Election':'Results')}>{page === 'Results' ? 'Back to election':'View full results'}<ArrowUpRight size={16}/></button></section><section className="trust-card"><span className="trust-icon"><ShieldCheck size={24}/></span><h3>Your vote has a record.</h3><p>Confirmed votes cannot be edited or deleted from the running blockchain.</p><div><Check size={14}/> One vote per wallet</div><div><Check size={14}/> Publicly verifiable results</div><div><Check size={14}/> No real money needed</div><button onClick={() => setPage('Setup guide')}>How it works <ArrowRight size={15}/></button></section></aside></div>
    {mode === 'blockchain' && <section className="panel activity"><div className="section-title"><h2>On-chain activity</h2><span>{connected ? 'Node connected':'Node unavailable'}</span></div><p className="contract-address">Contract: {config?.address || 'Not deployed yet'}</p>{events.length ? events.map(e => <div className="activity-row" key={e.hash}><CheckCircle2 size={17}/><span>{short(e.voter)} voted for <strong>{candidates[e.candidate]?.name}</strong><small>Block {e.block}</small></span><code title={e.hash}>{short(e.hash)}</code><button aria-label="Copy transaction hash" onClick={() => navigator.clipboard.writeText(e.hash).then(() => setMessage('Transaction hash copied.')).catch(() => setMessage(e.hash))}><Copy size={15}/></button></div>) : <p className="empty-state">No transactions to show yet.</p>}{account && owner.toLowerCase() === account.toLowerCase() && <button className="wallet-button" disabled={busy} onClick={toggleElection}>{open ? 'Close election' : 'Reopen election'} (owner only)</button>}</section>}
    </>}
    <footer><span><Vote size={16}/> CampusVote <span className="footer-divider">/</span> A voice for every student.</span><span>Built for learning. Designed for participation. <ArrowUpRight size={14}/></span></footer>
    </main></div>
    {confirm && <Confirm candidate={candidates[selected]} mode={mode} cancel={() => setConfirm(false)} submit={submit}/>}
  </div>;
}
function Confirm({candidate, mode, cancel, submit}) {
  const ref = React.useRef(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={cancel} onClose={cancel}><div className="modal"><span className="stat-icon blue"><Vote size={25}/></span><h2>Make your voice count.</h2><p>You’re voting for <strong>{candidate.name}</strong> as Student Council President.</p><div className="notice">{mode === 'preview' ? 'This preview simulates a vote. No blockchain transaction will be made.' : 'Your vote is public and cannot be changed after confirmation. Approve the transaction in MetaMask.'}</div><div className="modal-actions"><button className="wallet-button" autoFocus onClick={cancel}>Go back</button><button className="primary" onClick={submit}>Confirm vote <ArrowRight size={16}/></button></div></div></dialog>;
}
createRoot(document.getElementById('root')).render(<App/>);
