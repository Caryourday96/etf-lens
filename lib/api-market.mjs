import {MarketError,providerQuery,normalizeMatches,normalizeFund} from './market-data.mjs';
import {yahooQuery} from './yahoo-data.mjs';
export async function handleMarketRequest(request,env) {
  const url=new URL(request.url),mode=url.searchParams.get('mode');
  try {
    if(mode==='status')return Response.json({configured:!!env.ALPHA_VANTAGE_API_KEY,provider:'Alpha Vantage',refresh:'24 hours',dailyBudget:23});
    if(mode==='search'){
      const q=(url.searchParams.get('q')||'').trim();
      if(q.length<2||q.length>64)return Response.json({error:'Enter 2–64 characters.'},{status:400});
      const result=await providerQuery(env,'SYMBOL_SEARCH',{keywords:q.toUpperCase().replace(/\.TO$/,'.TRT')},7*86400000);
      return Response.json({matches:normalizeMatches(result.data),fetchedAt:result.fetchedAt,cached:result.cached});
    }
    if(mode==='fund'){
      const symbol=(url.searchParams.get('symbol')||'').toUpperCase().replace(/\.TO$/,'.TRT');
      if(!/^[A-Z0-9][A-Z0-9.\-]{0,24}$/.test(symbol))return Response.json({error:'Invalid ticker.'},{status:400});
      const warnings=[];
      let profile={data:{},fetchedAt:Date.now()};
      if(url.searchParams.get('kind')!=='Split-share fund')try{profile=await providerQuery(env,'ETF_PROFILE',{symbol});}catch{warnings.push('Expense ratio unavailable; enter a fee assumption to enable growth projections.');}
      let market=null;
      try{market=await yahooQuery(env,symbol);}catch{warnings.push('Public distribution feed unavailable; trying Alpha Vantage.');}
      if(market)return Response.json({fund:{...normalizeFund(symbol,profile.data,{},{}),...market.fund},fetchedAt:market.fetchedAt,profileFetchedAt:profile.fetchedAt,warnings});
      let quote={data:{},fetchedAt:profile.fetchedAt},dividends={data:{},fetchedAt:profile.fetchedAt};
      try{quote=await providerQuery(env,'GLOBAL_QUOTE',{symbol});}catch{warnings.push('Latest price unavailable.');}
      try{dividends=await providerQuery(env,'DIVIDENDS',{symbol});}catch{warnings.push('Actual distribution history unavailable. No dividend estimate will be shown.');}
      return Response.json({fund:{...normalizeFund(symbol,profile.data,quote.data,dividends.data),dividendSource:'Alpha Vantage'},fetchedAt:Math.min(profile.fetchedAt,quote.fetchedAt,dividends.fetchedAt),warnings});
    }
    return Response.json({error:'Unknown request.'},{status:400});
  }catch(error){return Response.json({error:error instanceof MarketError?error.message:'Market data is temporarily unavailable.'},{status:error instanceof MarketError?error.status:500,headers:{'Cache-Control':'no-store'}});}
}
