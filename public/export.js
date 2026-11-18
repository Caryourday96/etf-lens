function csvNumber(value){return Number.isFinite(value)?value.toFixed(5):'Unavailable';}
document.getElementById('export').onclick=()=>{
  if(!valid()||!dividendAmountValid())return;
  const s=scenario(),amount=Number(document.getElementById('dividendAmount').value);
  const rows=[['Ticker','Fund','Type','Trading currency','Expense ratio / MER (%)','Fee basis','Latest price','Price date','Actual TTM distributions per share','Last distribution per share','Last ex-date','Trailing distribution yield (%)','Distribution source','Retrieved','Annual income '+selectedCurrency,'Monthly equivalent '+selectedCurrency,'Projected balance '+selectedCurrency,'Income at horizon '+selectedCurrency]];
  for(const f of current()){
    const annual=dividendEstimate(amount,yieldFor(f.ticker)),balance=Number.isFinite(f.fee)?balances(s,f.fee).at(-1):null;
    rows.push([f.ticker,f.name,f.kind||'ETF',f.currency||'USD',f.fee??'Unavailable',f.feeBasis|| (f.provider?'Provider':'Issuer snapshot 2026-11-18'),csvNumber(f.price),f.priceDate||'Unavailable',csvNumber(f.annualDistribution),csvNumber(f.lastDistribution?.amount),f.lastDistribution?.date||'Unavailable',csvNumber(yieldFor(f.ticker)),f.dividendSource||'Unavailable',f.fetchedAt?new Date(f.fetchedAt).toISOString():'Not loaded',csvNumber(annual),annual===null?'Unavailable':csvNumber(annual/12),csvNumber(balance),balance===null?'Unavailable':csvNumber(dividendEstimate(balance,yieldFor(f.ticker)))]);
  }
  rows.push([],['Scenario currency',selectedCurrency],['Dividend investment amount',amount],['Starting growth investment',s.initial],['Monthly contribution',s.monthly],['Horizon years',s.years],['Assumed gross total return %',s.rate],['Income methodology','Investment × actual trailing 12-month distributions per share ÷ latest available price. Future payments can differ. Monthly equivalents are averages, not payment schedules. No sample yields.'],['Currency methodology','Changing CAD/USD re-denominates the entered number; it does not convert it. Cross-currency estimates assume a constant exchange rate.'],['Growth methodology','Hypothetical total return with dividends reinvested. Do not add estimated income to projected balances. Excludes tax, withholding, FX costs and spreads.']);
  const escape=value=>{let str=String(value??'Unavailable');if(/^[=+@]/.test(str))str="'"+str;return '"'+str.replaceAll('"','""')+'"';};
  const csv=rows.map(row=>row.map(escape).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='etf-lens-comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
