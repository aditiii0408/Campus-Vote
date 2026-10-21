import { chromium } from '@playwright/test';
import { JsonRpcProvider, Contract } from 'ethers';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const rpc = new JsonRpcProvider('http://127.0.0.1:8545',31337);
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1080}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
let current = 1;
await page.exposeFunction('testWalletRequest',async ({method,params}) => {
  if(method === 'eth_requestAccounts' || method === 'eth_accounts') return [(await rpc.getSigner(current)).address];
  if(method === 'wallet_switchEthereumChain') return null;
  return rpc.send(method,params || []);
});
await page.addInitScript(()=>{
  const handlers={};
  window.ethereum={request:args=>window.testWalletRequest(args),on:(event,fn)=>{handlers[event]=fn;},removeListener:(event)=>delete handlers[event]};
  window.testAccountChanged=()=>handlers.accountsChanged?.([]);
});
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:5174');
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.getByText('Connected to your local blockchain.',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Select candidate/}).nth(1).click();
  await page.getByRole('button',{name:'Cast my vote',exact:true}).click();
  await page.getByRole('button',{name:'Confirm vote',exact:true}).click();
  await page.getByText('Transaction confirmed',{exact:true}).waitFor();
  const config=JSON.parse(fs.readFileSync('public/deployment.json','utf8'));
  const contract=new Contract(config.address,config.abi,rpc);
  assert.equal(await contract.votes(1),1n);
  assert.equal(await contract.hasVoted((await rpc.getSigner(1)).address),true);
  assert.equal(await page.getByRole('button',{name:'Vote recorded',exact:true}).isDisabled(),true);
  await page.reload();
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.getByRole('button',{name:'Vote recorded',exact:true}).waitFor();
  current=0;
  await page.evaluate(()=>window.testAccountChanged());
  await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
  await page.getByRole('button',{name:'Close election (owner only)'}).click();
  await page.getByText('ELECTION CLOSED',{exact:true}).waitFor();
  assert.equal(await contract.isOpen(),false);
  await page.getByRole('button',{name:'Reopen election (owner only)'}).click();
  await page.getByText('VOTING OPEN',{exact:true}).waitFor();
  assert.equal(await contract.isOpen(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: injected wallet → real local chain vote, receipt, reload persistence, account change, owner close/reopen. MetaMask extension approval UI is not automated.');
} finally {await browser.close();rpc.destroy();}
