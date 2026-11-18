export class MarketError extends Error {
  constructor(message,status=502){super(message);this.status=status;}
}
export function numeric(value){if(value===null||value===undefined||value===''||value==='None'||value==='-')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
export function normalizeMatches(data) {
  if(!Array.isArray(data.bestMatches))throw new MarketError('No search results were returned by the provider.');
  return data.bestMatches.filter(row=>(/ETF|Exchange.Traded/i.test(row['3. type']||'')||/split|financial 15|dividend 15/i.test(row['2. name']||''))&&['USD','CAD'].includes(row['8. currency'])).slice(0,15).map(row=>({ticker:row['1. symbol'].replace(/\.TRT$/,'.TO'),providerSymbol:row['1. symbol'],name:row['2. name'],currency:row['8. currency'],region:row['4. region'],kind:/ETF|Exchange.Traded/i.test(row['3. type']||'')?'ETF':'Split-share fund'}));
}
export function normalizeFund(symbol,profile,quote,dividends,now=Date.now()) {
  const expense=numeric(profile.net_expense_ratio ?? profile.expense_ratio);
  const fee=expense!==null&&expense>=0&&expense<=1?expense*100:null;
  const q=quote?.['Global Quote']||{},price=numeric(q['05. price']);
  const cutoff=new Date(now);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
  const history=Array.isArray(dividends?.data)?dividends.data:null;
  const entries=history?.filter(d=>d.ex_dividend_date&&d.ex_dividend_date>=cutoff.toISOString().slice(0,10)&&d.ex_dividend_date<=new Date(now).toISOString().slice(0,10));
  const validHistory=entries&&entries.every(d=>numeric(d.amount)!==null&&numeric(d.amount)>=0);
  const annual=validHistory&&entries.length?entries.reduce((sum,d)=>sum+Number(d.amount),0):null;
  const dividendYield=annual!==null&&price>0 ? annual/price*100 : null;
  return {ticker:symbol,name:profile.name||symbol,issuer:profile.fund_family||'Not supplied',fee,exposure:profile.asset_class||'See provider / issuer documents',index:profile.index||'Not supplied',url:'https://www.alphavantage.co/documentation/#etf-profile',price:price>0?price:null,priceDate:q['07. latest trading day']||null,dividendYield,annualDistribution:annual,dividendBasis:annual!==null&&price>0?'Trailing 12-month distributions by ex-date ÷ latest available price':'Provider-reported yield; calculation period not supplied',currency:profile.currency||null};
}
export async function providerQuery(env,fn,params,ttl=86400000,fetcher=fetch){
  if(!env.ALPHA_VANTAGE_API_KEY)throw new MarketError('Market data setup is waiting for your free Alpha Vantage API key. The existing calculator still works.',503);
  if(!env.DB)throw new MarketError('Market data storage is not available.',503);
  const key=fn+':'+JSON.stringify(params),now=Date.now();
  const cached=await env.DB.prepare('SELECT payload, fetched_at FROM provider_cache WHERE key = ?').bind(key).first();
  if(cached&&now-cached.fetched_at<ttl)return {data:JSON.parse(cached.payload),fetchedAt:cached.fetched_at,cached:true};
  const day=new Date(now).toISOString().slice(0,10);
  await env.DB.prepare('INSERT OR IGNORE INTO provider_budget (day, requests) VALUES (?, 0)').bind(day).run();
  let reserved=false;
  for(let attempt=0;attempt<6;attempt++){
    const time=Date.now();
    const budget=await env.DB.prepare('UPDATE provider_budget SET requests = requests + 1, last_at = ? WHERE day = ? AND requests < 23 AND last_at <= ? RETURNING requests').bind(time,day,time-1200).first();
    if(budget){reserved=true;break;}
    const used=await env.DB.prepare('SELECT requests FROM provider_budget WHERE day = ?').bind(day).first();
    if(used?.requests>=23)throw new MarketError('The app’s free-data allowance has been reached for today. Cached comparisons still work. Try again tomorrow (UTC).',429);
    await new Promise(resolve=>setTimeout(resolve,1250));
  }
  if(!reserved)throw new MarketError('Another market data request is running. Try again in a few seconds.',429);
  const url=new URL('https://www.alphavantage.co/query');url.searchParams.set('function',fn);url.searchParams.set('apikey',env.ALPHA_VANTAGE_API_KEY);
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
  let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(15000)});}catch{throw new MarketError('The data provider could not be reached. Try again later.');}
  if(!response.ok)throw new MarketError('The data provider is temporarily unavailable.');
  const reader=response.body.getReader();let size=0,parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();throw new MarketError('The provider response exceeded the supported size.');}parts.push(value);}
  let body;try{body=JSON.parse(new TextDecoder().decode(Uint8Array.from(parts.flatMap(p=>Array.from(p)))));}catch{throw new MarketError('The provider returned an unreadable response.');}
  if(body.Information||body.Note)throw new MarketError('The provider declined this request: check the API key, free-plan access, or request allowance.',429);
  if(body['Error Message'])throw new MarketError('The provider does not support this symbol or request.',404);
  if(!body||typeof body!=='object'||!Object.keys(body).length)throw new MarketError('No data is available for this symbol.',404);
  await env.DB.prepare('INSERT INTO provider_cache (key, payload, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at').bind(key,JSON.stringify(body),now).run();
  return {data:body,fetchedAt:now,cached:false};
}
