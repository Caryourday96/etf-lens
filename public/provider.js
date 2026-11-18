const textHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function restoreProviderFunds(){
  try {
    const saved=JSON.parse(localStorage.getItem('etf-lens-provider-funds'));
    if(!Array.isArray(saved))return;
    for(const f of saved.slice(0,100)){
      if(!/^[A-Z0-9][A-Z0-9.\-]{0,24}$/.test(f.ticker)||(f.fee!==null&&(!Number.isFinite(f.fee)||f.fee<0||f.fee>100)))continue;
      // Stored provider values never supply HTML or arbitrary URLs to the UI.
      const issuer=funds.find(x=>x.ticker===f.ticker)?.url;
      const clean={...f,url:issuer||'https://www.alphavantage.co/documentation/#etf-profile'};
      for(const key of ['name','issuer','exposure','index'])clean[key]=String(f[key]||'Not supplied').replace(/[<>]/g,'');
      if(!Number.isFinite(clean.dividendYield)||clean.dividendYield<0||clean.dividendYield>100)clean.dividendYield=null;
      const index=funds.findIndex(x=>x.ticker===f.ticker);if(index>=0)funds[index]=clean;else funds.push(clean);
    }
  } catch {}
}
function saveProviderFunds(){try{localStorage.setItem('etf-lens-provider-funds',JSON.stringify(funds.filter(f=>f.provider||f.locallySaved)));}catch{}}
async function marketRequest(params){
  const response=await fetch('/api/market?'+new URLSearchParams(params));
  const data=await response.json();if(!response.ok)throw Error(data.error||'Market data request failed.');return data;
}
function providerNote(fund){
  if(Number.isFinite(fund.annualDistribution)&&Number.isFinite(fund.dividendYield))return (fund.dividendSource||'Market data provider')+' · '+fund.dividendBasis+' · retrieved '+new Date(fund.fetchedAt).toLocaleDateString()+'.';
  return 'Actual distribution data is not loaded or unavailable. No sample yield is substituted.';
}
async function loadProviderFund(match,add=true){
  const data=await marketRequest({mode:'fund',symbol:match.providerSymbol||match.ticker,kind:match.kind||'ETF'});
  const existing=funds.find(f=>f.ticker===match.ticker);
  const f={...data.fund,ticker:match.ticker,providerSymbol:match.providerSymbol||match.ticker,kind:match.kind||existing?.kind||'ETF',currency:match.currency||data.fund.currency||'USD',name:match.name||data.fund.name,provider:'Alpha Vantage',fetchedAt:data.fetchedAt};
  if(!Number.isFinite(f.fee)&&Number.isFinite(existing?.fee)){f.fee=existing.fee;f.feeBasis=existing.feeBasis||'Issuer snapshot 2026-11-18';}
  if(existing?.url)f.url=existing.url;
  for(const key of ['issuer','exposure','index'])if((!f[key]||f[key]==='Not supplied'||f[key]==='See provider / issuer documents')&&existing?.[key])f[key]=existing[key];
  for(const key of ['name','issuer','exposure','index'])f[key]=String(f[key]||'Not supplied').replace(/[<>]/g,'');
  const index=funds.findIndex(x=>x.ticker===f.ticker);if(index>=0)funds[index]=f;else funds.push(f);
  saveProviderFunds();
  if(add&&!selected.includes(f.ticker)&&selected.length<4)selected.push(f.ticker);
  render();return data.warnings;
}
async function initializeProvider(){
  const status=document.getElementById('providerStatus'),results=document.getElementById('providerResults'),button=document.getElementById('providerSearch');
  let configured=false;
  try {const data=await marketRequest({mode:'status'});configured=data.configured;status.textContent=data.configured?'Free data connected · prices and actual distributions cached for 24 hours · not real-time. Search and US ETF fee lookups use the Alpha Vantage free allowance.':'Fund search is waiting for the API key. Existing funds can still load public distribution data.';}catch{status.textContent='Market data connection unavailable. Your saved calculator remains available.';}
  button.onclick=async()=>{
    const q=document.getElementById('search').value.trim();results.replaceChildren();
    if(q.length<2){status.textContent='Enter at least two characters, then search the provider.';return;}
    button.disabled=true;status.textContent='Searching Canadian and US ETFs and split-share funds…';
    try {
      const data=await marketRequest({mode:'search',q});
      status.textContent=data.matches.length?'Select a result to load its fund and dividend data. Canadian coverage varies by symbol. Missing expenses can be entered manually.':'No supported CAD/USD fund matches returned. Try the fund name or exact ticker; the provider does not cover every ETF.';
      for(const match of data.matches){const b=document.createElement('button');b.textContent=match.ticker+' · '+match.name+' · '+match.currency+' · '+match.kind;b.onclick=async()=>{
        if(selected.length>=4&&!selected.includes(match.ticker)){status.textContent='Remove a selected fund before adding another.';return;}
        b.disabled=true;status.textContent='Loading '+match.ticker+'…';try{const warnings=await loadProviderFund(match);status.textContent='Loaded '+match.ticker+'. '+warnings.join(' ');}catch(error){status.textContent=error.message;}finally{b.disabled=false;}
      };results.append(b);}
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  };
  document.getElementById('refreshFunds').onclick=async event=>{
    const button=event.currentTarget;button.disabled=true;let loaded=0;const errors=[];
    try{for(const f of current()){try{const warnings=await loadProviderFund(f,false);loaded++;errors.push(...warnings);}catch(error){errors.push(f.ticker+': '+error.message);}}status.textContent='Updated '+loaded+' fund(s). '+errors.join(' ');}finally{button.disabled=false;}
  };
  if(configured){for(const f of current().filter(f=>!f.fetchedAt||Date.now()-f.fetchedAt>86400000)){try{await loadProviderFund(f,false);}catch(error){status.textContent=error.message;}}}
}
