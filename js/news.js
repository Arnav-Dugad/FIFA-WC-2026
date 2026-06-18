/* =====================================================================
   FIFA WORLD CUP 2026 — SHARED LIVE NEWS MODULE  (js/news.js)
   ---------------------------------------------------------------------
   Free, no-key live news from public RSS feeds, fetched through free
   CORS proxies (so it works from the browser). Returns parsed items with
   real images where the feed provides them. Used by the News page, the
   home page, and per-match "related news".
   ===================================================================== */
const NewsFeed = (() => {
  const PROXIES = [
    { build:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u),       json:true  },
    { build:u=>'https://api.codetabs.com/v1/proxy/?quest='+encodeURIComponent(u), json:false },
    { build:u=>'https://corsproxy.io/?url='+encodeURIComponent(u),                json:false },
    { build:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),       json:false },
  ];
  async function fetchText(url){
    for(const p of PROXIES){
      try{
        const r = await fetch(p.build(url), {cache:'no-store'});
        if(!r.ok) continue;
        if(p.json){ const j=await r.json(); if(j && j.contents && j.contents.length>150) return j.contents; }
        else { const t=await r.text(); if(t && t.length>150 && /<(item|entry)/i.test(t)) return t; }
      }catch(e){}
    }
    return null;
  }
  function googleNews(q){ return 'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-US&gl=US&ceid=US:en'; }

  function parseItems(xml, srcDefault){
    let doc; try{ doc=new DOMParser().parseFromString(xml,'text/xml'); }catch(e){ return []; }
    if(!doc || doc.getElementsByTagName('parsererror').length){ try{ doc=new DOMParser().parseFromString(xml,'text/html'); }catch(e){ return []; } }
    const items=[...doc.querySelectorAll('item, entry')];
    return items.slice(0,25).map(it=>{
      const q=t=>{ const e=it.querySelector(t); return e?e.textContent.trim():''; };
      let title=q('title'); let link=q('link');
      if(!link){ const a=it.querySelector('link'); if(a) link=a.getAttribute('href')||''; }
      const srcEl=it.querySelector('source'); const src=srcEl?srcEl.textContent.trim():srcDefault;
      if(srcEl && src){ title=title.replace(new RegExp('\\s*-\\s*'+src.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$'),''); }
      let img='', bestW=0;
      [...it.getElementsByTagName('media:content'),...it.getElementsByTagName('media:thumbnail')].forEach(m=>{ const u=m.getAttribute('url'); const w=+(m.getAttribute('width')||0); if(u&&(w>=bestW||!img)){ img=u; bestW=w; } });
      if(!img){ const enc=it.querySelector('enclosure'); if(enc && /image/i.test(enc.getAttribute('type')||'')) img=enc.getAttribute('url')||''; }
      const desc=q('description')||q('summary')||q('content');
      if(!img){ const mm=desc.match(/<img[^>]+src=["']([^"']+)["']/i); if(mm) img=mm[1]; }
      return { title, link, date:q('pubDate')||q('published')||q('updated'), blurb:desc.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim().slice(0,210), img, src };
    }).filter(x=>x.title && x.link);
  }

  async function feed(url, src){ const xml=await fetchText(url); return xml ? parseItems(xml, src) : []; }

  const WC_FEEDS = [
    { url:'https://www.theguardian.com/football/world-cup-2026/rss', src:'The Guardian' },
    { url:'https://feeds.bbci.co.uk/sport/football/rss.xml',         src:'BBC Sport'   },
    { url: googleNews('FIFA World Cup 2026'),                        src:'Google News' },
    { url:'https://www.theguardian.com/football/rss',               src:'The Guardian' },
  ];

  const cache = {};
  async function load(feeds, ttl){
    feeds = feeds || WC_FEEDS; ttl = ttl || 5*60000;
    const key = feeds.map(f=>f.url).join('|');
    if(cache[key] && Date.now()-cache[key].t < ttl) return cache[key].items;
    const res = await Promise.allSettled(feeds.map(f=>feed(f.url,f.src)));
    let all=[]; res.forEach(r=>{ if(r.status==='fulfilled') all=all.concat(r.value); });
    const seen=new Set(); all=all.filter(a=>{ const k=a.title.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
    all.sort((a,b)=> new Date(b.date)-new Date(a.date));
    if(all.length) cache[key]={ t:Date.now(), items:all };
    return all;
  }
  async function forMatch(home, away){
    return load([{ url:googleNews(`${home} ${away} football world cup`), src:'Google News' }], 5*60000);
  }

  return { load, feed, forMatch, googleNews, WC_FEEDS };
})();
