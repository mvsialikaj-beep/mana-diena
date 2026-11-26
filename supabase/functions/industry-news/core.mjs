export const SOURCES=Object.freeze([
  {id:'kursors',name:'Kursors.lv',url:'https://kursors.lv/feed/',site:'https://kursors.lv/',hosts:['kursors.lv'],category:'tech',language:'lv'},
  {id:'lsm',name:'LSM Tehnoloģijas',url:'https://www.lsm.lv/rss/?lang=lv&catid=61',site:'https://www.lsm.lv/',hosts:['www.lsm.lv','lsm.lv'],category:'tech',language:'lv'},
  {id:'verge',name:'The Verge',url:'https://www.theverge.com/rss/index.xml',site:'https://www.theverge.com/',hosts:['www.theverge.com','theverge.com'],category:'tech',language:'en'},
  {id:'mit',name:'MIT Technology Review',url:'https://www.technologyreview.com/topic/artificial-intelligence/feed/',site:'https://www.technologyreview.com/',hosts:['www.technologyreview.com','technologyreview.com'],category:'ai',language:'en'},
  {id:'practical',name:'Practical Ecommerce',url:'https://www.practicalecommerce.com/feed',site:'https://www.practicalecommerce.com/',hosts:['www.practicalecommerce.com','practicalecommerce.com'],category:'commerce',language:'en'},
  {id:'shopify',name:'Shopify jaunumi',url:'https://changelog.shopify.com/feed.xml',site:'https://changelog.shopify.com/',hosts:['changelog.shopify.com','www.shopify.com','shopify.com'],category:'commerce',language:'en'}
]);
export function plain(value){return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity)=>{const known={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};if(entity[0]!=='#')return known[entity.toLowerCase()]||'';const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):''}).replace(/\u2014/g,'-').replace(/\s+/g,' ').trim()}
function tag(xml,name){return xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||''}
export function articleUrl(value,source){try{const url=new URL(plain(value),source.site);if(url.protocol!=='https:'||url.username||url.password||!source.hosts.includes(url.hostname)||(url.port&&url.port!=='443'))return null;url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','gclid'].includes(key))url.searchParams.delete(key);return url.href}catch{return null}}
export function classify(title,fallback){if(fallback==='commerce')return fallback;return /\b(?:ai|mi|openai|chatgpt|anthropic|claude|gemini|llm|gpt|copilot|deepseek)\b|mākslīg.{0,12}intelekt|artificial intelligence|machine learning|generat(?:ive|īv)/iu.test(title)?'ai':fallback}
export function parseFeed(xml,source,now=Date.now()){
  if(typeof xml!=='string'||xml.length>1500000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsupported feed');
  const blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>|<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)||[],articles=[];
  for(const block of blocks.slice(0,40)){
    const title=plain(tag(block,'title')).slice(0,240);let link=tag(block,'link');
    if(!link){const links=[...block.matchAll(/<link\s+([^>]*?)\/?\s*>/gi)];for(const candidate of links){const attrs=candidate[1],rel=attrs.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1];if(rel&&rel!=='alternate')continue;link=attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1]||'';if(link)break}}
    const url=link&&articleUrl(link,source),published=Date.parse(plain(tag(block,'pubDate')||tag(block,'published')||tag(block,'updated')||tag(block,'dc:date')));
    if(!title||!url||!Number.isFinite(published)||published>now+600000||published<now-14*86400000)continue;
    articles.push({id:source.id+':'+url,title,url,publishedAt:new Date(published).toISOString(),source:source.name,sourceId:source.id,category:classify(title,source.category),language:source.language});
  }
  return articles;
}
export function mergeArticles(groups,now=Date.now()){const seen=new Set();return groups.flat().filter(a=>{if(!a||seen.has(a.url)||Date.parse(a.publishedAt)<now-14*86400000)return false;seen.add(a.url);return true}).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,120)}
export async function fetchFeed(source,fetcher=fetch,now=Date.now()){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let reader;
  try{const response=await fetcher(source.url,{signal:controller.signal,redirect:'error',headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9','User-Agent':'ManaIkdienaRSS/1.0 (+https://mvsialikaj-beep.github.io/mana-diena/)'}});if(!response.ok)throw Error('Feed unavailable');if(!response.body)throw Error('Empty feed');reader=response.body.getReader();const decoder=new TextDecoder();let size=0,xml='';while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000)throw Error('Feed too large');xml+=decoder.decode(value,{stream:true});if((xml.match(/<\/(?:item|entry)>/gi)||[]).length>=25)break}xml+=decoder.decode();return parseFeed(xml,source,now)}finally{clearTimeout(timer);if(reader)await reader.cancel().catch(()=>{})}
}
