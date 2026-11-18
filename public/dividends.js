// Actual distribution history only. Missing data is never replaced with a sample yield.
const incomeMoney=value=>currencyFormat(value,2);
function dividendEstimate(balance,yieldPercent){return Number.isFinite(yieldPercent)?balance*yieldPercent/100:null;}
function yieldFor(ticker){const f=funds.find(f=>f.ticker===ticker);return Number.isFinite(f?.annualDistribution)&&Number.isFinite(f?.dividendYield)?f.dividendYield:null;}
function dividendInputsValid(){return true;}
function renderDividends(){
  const container=document.getElementById('dividendCards');
  container.innerHTML=current().map((fund,i)=>`<article class="dividend-card" style="--color:${colors[i]}"><h3>${fund.ticker}</h3><p class="actual-yield">Actual trailing distribution yield<br><strong>${yieldFor(fund.ticker)===null?'Unavailable':yieldFor(fund.ticker).toFixed(2)+'%'}</strong></p><p class="yield-source">${textHTML(providerNote(fund))}</p><button type="button" data-update-dividends="${fund.ticker}">Update actual dividends</button><p class="split-note">${fund.kind==='Split-share fund'?'Split-share distributions may be suspended when asset coverage conditions are not met. Class A and preferred shares have different rights and risks.':''}</p><dl><div><dt>Last reported distribution per share</dt><dd>${fund.lastDistribution?textHTML((fund.currency||'USD')+' '+fund.lastDistribution.amount.toFixed(5)):'Unavailable'}</dd><small>${fund.lastDistribution?textHTML(fund.lastDistribution.date+' · ex-date'):''}</small></div><div><dt>Actual trailing 12-month distributions / share</dt><dd>${Number.isFinite(fund.annualDistribution)?textHTML((fund.currency||'USD')+' '+fund.annualDistribution.toFixed(5)):'Unavailable'}</dd></div><div><dt>Estimated annual income on your investment</dt><dd id="annual-${fund.ticker}"></dd></div><div><dt>Monthly equivalent</dt><dd id="monthly-${fund.ticker}"></dd></div><div><dt>Annual income at horizon balance</dt><dd id="future-${fund.ticker}"></dd></div></dl><a href="${fund.dividendSourceUrl||fund.url}" target="_blank" rel="noopener">View distribution source</a></article>`).join('');
  container.onclick=async event=>{const ticker=event.target.dataset.updateDividends;if(!ticker)return;const fund=funds.find(f=>f.ticker===ticker);event.target.disabled=true;try{const warnings=await loadProviderFund(fund,false);document.getElementById('providerStatus').textContent='Updated '+ticker+'. '+warnings.join(' ');}catch(error){document.getElementById('providerStatus').textContent=error.message;event.target.disabled=false;}};
  updateDividendEstimates();
}
function updateDividendEstimates(){
  const s=scenario();
  for(const fund of current()){
    if(!document.getElementById('annual-'+fund.ticker))continue;
    const yieldPercent=yieldFor(fund.ticker),annual=dividendEstimate(Number(document.getElementById('dividendAmount').value),yieldPercent);
    document.getElementById('annual-'+fund.ticker).textContent=dividendAmountValid()&&annual!==null?incomeMoney(annual):'Unavailable';
    document.getElementById('monthly-'+fund.ticker).textContent=dividendAmountValid()&&annual!==null?incomeMoney(annual/12):'Unavailable';
    const future=valid()&&Number.isFinite(fund.fee)?dividendEstimate(balances(s,fund.fee).at(-1),yieldPercent):null;
    document.getElementById('future-'+fund.ticker).textContent=future===null?'Unavailable':incomeMoney(future);
  }
}
