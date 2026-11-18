import fs from 'node:fs';
const route=fs.readFileSync('app/api/market/route.ts','utf8').replace("import {env} from 'cloudflare:workers';\n",'').replaceAll("'../../../lib/market-data.mjs'","'./market-data.mjs'").replaceAll("'../../../lib/yahoo-data.mjs'","'./yahoo-data.mjs'").replace('GET(request:Request)','handleMarketRequest(request,env)');
fs.writeFileSync('lib/api-market.mjs',route);
fs.mkdirSync('outputs/azure',{recursive:true});
for(const name of ['public','ui','lib'])fs.cpSync(name,'outputs/azure/'+name,{recursive:true});
fs.copyFileSync('server.mjs','outputs/azure/server.mjs');
fs.writeFileSync('outputs/azure/package.json',JSON.stringify({name:'adeticket-etf-lens',version:'1.0.0',private:true,type:'module',engines:{node:'>=24'},scripts:{start:'node server.mjs'}},null,2));
