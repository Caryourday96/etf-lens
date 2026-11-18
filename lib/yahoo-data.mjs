import {MarketError,numeric} from './market-data.mjs';
export function normalizeYahoo(data,now=Date.now()){
  const result=data?.chart?.result?.[0],meta=result?.meta;
  if(!meta||!['CAD','USD'].includes(meta.currency))throw new MarketError('No supported CAD/USD price data returned.',404);
  const price=numeric(meta.regularMarketPrice),cutoff=new Date(now);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
  const history=Object.values(result.events?.dividends||{}).filter(d=>Number.isFinite(d.date)&&d.date*1000>=cutoff.getTime()&&d.date*1000<=now&&numeric(d.amount)!==null&&Number(d.amount)>=0).sort((a,b)=>b.date-a.date);
  const annual=history.length?history.reduce((sum,d)=>sum+Number(d.amount),0):null;
  return {price:price>0?price:null,priceDate:Number.isFinite(meta.regularMarketTime)?new Date(meta.regularMarketTime*1000).toISOString().slice(0,10):null,currency:meta.currency,name:meta.longName||meta.shortName||meta.symbol,annualDistribution:annual,dividendYield:annual!==null&&price>0?annual/price*100:null,lastDistribution:history[0]?{amount:Number(history[0].amount),date:new Date(history[0].date*1000).toISOString().slice(0,10)}:null,dividendHistory:history.map(d=>({amount:Number(d.amount),date:new Date(d.date*1000).toISOString().slice(0,10)})),dividendBasis:'Actual trailing 12-month distributions by ex-date divided by latest available price',dividendSource:'Yahoo Finance',dividendSourceUrl:'https://finance.yahoo.com/quote/'+encodeURIComponent(meta.symbol)+'/history/?filter=div'};
}
export async function yahooQuery(env,symbol,fetcher=fetch){
  if(!env.DB)throw new MarketError('Market data storage is not available.',503);
  const ticker=symbol.replace(/\.TRT$/,'.TO'),key='YAHOO:'+ticker,now=Date.now();
  const cached=await env.DB.prepare('SELECT payload, fetched_at FROM provider_cache WHERE key = ?').bind(key).first();
  if(cached&&now-cached.fetched_at<86400000)return {fund:normalizeYahoo(JSON.parse(cached.payload)),fetchedAt:cached.fetched_at};
  const url=new URL('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(ticker));url.searchParams.set('interval','1mo');url.searchParams.set('range','1y');url.searchParams.set('events','div');
  let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(15000)});}catch{throw new MarketError('Distribution data could not be reached.');}
  if(!response.ok)throw new MarketError('Distribution data is temporarily unavailable.');
  const reader=response.body.getReader();let size=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();throw new MarketError('The provider response exceeded the supported size.');}parts.push(value);}
  const merged=new Uint8Array(size);let offset=0;for(const part of parts){merged.set(part,offset);offset+=part.byteLength;}
  let data;try{data=JSON.parse(new TextDecoder().decode(merged));}catch{throw new MarketError('Unreadable distribution data.');}
  const fund=normalizeYahoo(data);
  await env.DB.prepare('INSERT INTO provider_cache (key, payload, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at').bind(key,JSON.stringify(data),now).run();
  return {fund,fetchedAt:now};
}
