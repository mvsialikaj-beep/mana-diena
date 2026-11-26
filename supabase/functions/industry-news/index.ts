import { SOURCES,fetchFeed,mergeArticles } from './core.mjs';
const TTL=10*60*1000,MAX_STALE=86400000;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Access-Control-Allow-Methods':'GET, OPTIONS'};
const applicationPublicKey='sb_publishable_oOgXhYn7jER-6jOFmQsmgg_JG8o9A0X';
const validKeys=new Set([applicationPublicKey,Deno.env.get('SUPABASE_ANON_KEY')||'']);
try{for(const key of Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}')))if(typeof key==='string')validKeys.add(key)}catch{}
validKeys.delete('');
let cache:any=null,pending:Promise<any>|null=null;const previous=new Map<string,{articles:any[],at:number}>();
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'private, max-age=600':'no-store'}});
async function collect(){const now=Date.now(),results=await Promise.allSettled(SOURCES.map(async source=>{const articles=await fetchFeed(source);if(!articles.length)throw Error('No recent articles');previous.set(source.id,{articles,at:now});return articles}));const groups:any[]=[],sources:any[]=[];let fresh=0;
  for(let i=0;i<SOURCES.length;i++){const source=SOURCES[i],result=results[i],old=previous.get(source.id);if(result.status==='fulfilled'){groups.push(result.value);fresh++;sources.push({id:source.id,name:source.name,site:source.site,category:source.category,language:source.language,status:'ok'})}else{if(old&&now-old.at<MAX_STALE)groups.push(old.articles);sources.push({id:source.id,name:source.name,site:source.site,category:source.category,language:source.language,status:old&&now-old.at<MAX_STALE?'stale':'unavailable'})}}
  const articles=mergeArticles(groups,now);if(!articles.length)throw Error('No feeds available');return {version:1,articles,sources,fetchedAt:new Date(now).toISOString(),stale:fresh===0};
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(!validKeys.has(req.headers.get('apikey')||''))return json({error:'Unauthorized'},401);
  if(req.method!=='GET')return json({error:'Method not allowed'},405);
  if(cache&&Date.now()-Date.parse(cache.fetchedAt)<TTL)return json(cache);
  try{if(!pending)pending=collect().then(value=>(cache=value,value)).finally(()=>{pending=null});return json(await pending)}catch{if(cache&&Date.now()-Date.parse(cache.fetchedAt)<MAX_STALE)return json({...cache,stale:true});return json({error:'Ziņu avoti pašlaik neatbild. Mēģini vēlāk.'},503)}
});
