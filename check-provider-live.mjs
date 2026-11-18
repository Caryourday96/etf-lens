import {normalizeFund,normalizeMatches} from './lib/market-data.mjs';
process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stderr.write('Ready for API key on stdin (hidden).\n');
const key=await new Promise(resolve=>{let value='';process.stdin.on('data',chunk=>{value+=chunk;if(/[\r\n]/.test(value)){process.stdin.setRawMode(false);process.stdin.pause();resolve(value.trim());}});});
const results={};
for(const [name,params] of Object.entries({search:{function:'SYMBOL_SEARCH',keywords:'XEQT'},veqt:{function:'SYMBOL_SEARCH',keywords:'VEQT'},ffn:{function:'SYMBOL_SEARCH',keywords:'FFN'},profile:{function:'ETF_PROFILE',symbol:'XEQT.TRT'},quote:{function:'GLOBAL_QUOTE',symbol:'XEQT.TRT'},dividends:{function:'DIVIDENDS',symbol:'XEQT.TRT'}})){
  await new Promise(resolve=>setTimeout(resolve,1250));
  const url=new URL('https://www.alphavantage.co/query');for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);url.searchParams.set('apikey',key);
  try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});results[name]=await response.json();console.log(JSON.stringify({endpoint:name,keys:Object.keys(results[name]),data:results[name].bestMatches||results[name]['Global Quote']||results[name].data?.slice(0,3),message:results[name].Information||results[name].Note||results[name]['Error Message']}));}catch{console.log('Provider request failed: '+name);process.exit(1);}
}
try{console.log(JSON.stringify({matches:normalizeMatches(results.search),fund:normalizeFund('VOO',results.profile,results.quote,results.dividends)}));}catch(error){console.log(error.message);}
