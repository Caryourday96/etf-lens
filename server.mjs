import {createServer} from 'node:http';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {handleMarketRequest} from './lib/api-market.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const databasePath=process.env.ETF_DATABASE_PATH||resolve(process.env.HOME&&process.platform!=='win32'?process.env.HOME:root,'.etf-lens-data/cache.sqlite');
mkdirSync(dirname(databasePath),{recursive:true});
const database=new DatabaseSync(databasePath);
database.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS provider_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS provider_budget (day TEXT PRIMARY KEY, requests INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL DEFAULT 0);');
const DB={prepare(sql){const statement=database.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async first(){return statement.get(...args)||null;},async run(){statement.run(...args);return {success:true};}};}};
const env={DB,ALPHA_VANTAGE_API_KEY:process.env.ALPHA_VANTAGE_API_KEY};
const assets=new Map(),types={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const limit=new Map();
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
    if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',hosting:'Azure App Service'}));return;}
    if(url.pathname==='/api/market'){
      const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0],now=Date.now();
      let entry=limit.get(ip);if(!entry||now-entry.start>600000){entry={start:now,count:0};limit.set(ip,entry);}entry.count++;
      if(limit.size>1000)for(const [key,value] of limit)if(now-value.start>600000)limit.delete(key);
      if(entry.count>80){res.writeHead(429,{'Content-Type':'application/json','Retry-After':'600'});res.end(JSON.stringify({error:'Too many requests. Try again shortly.'}));return;}
      const response=await handleMarketRequest(new Request(url),env);
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    let path;if(url.pathname==='/')path=resolve(root,'ui/index.html');else{
      const decoded=decodeURIComponent(url.pathname),candidate=resolve(root,'public','.'+decoded);
      if(!candidate.startsWith(resolve(root,'public')+'/')&&!candidate.startsWith(resolve(root,'public')+'\\')){res.writeHead(404);res.end('Not found');return;}path=candidate;
    }
    if(!existsSync(path)){res.writeHead(404);res.end('Not found');return;}
    if(!assets.has(path))assets.set(path,readFileSync(path));
    res.writeHead(200,{'Content-Type':url.pathname==='/'?'text/html; charset=utf-8':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:assets.get(path));
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Request could not be completed.'}));}
});
server.listen(Number(process.env.PORT||4318),'0.0.0.0',()=>console.log('ETF Lens listening on port '+(process.env.PORT||4318)));
process.on('SIGTERM',()=>server.close(()=>{database.close();process.exit(0);}));
