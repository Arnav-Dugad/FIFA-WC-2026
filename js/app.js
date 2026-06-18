/* =====================================================================
   FIFA WORLD CUP 2026 — SHARED APP LOGIC
   Navigation, local-time conversion, countdown, standings & render helpers
   used by every page. Loaded after data.js.
   ===================================================================== */

/* ----------  small DOM helpers  ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const el = (tag, cls, html) => { const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; };

/* ----------  bespoke brand emblem ("26" trophy mark) — original artwork  ---------- */
const BRAND_SVG = `<svg class="emblem" viewBox="0 0 48 48" aria-hidden="true" role="img">
  <defs>
    <linearGradient id="emg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff2d78"/><stop offset=".4" stop-color="#9b3cff"/><stop offset=".72" stop-color="#3a7bff"/><stop offset="1" stop-color="#00d6c2"/>
    </linearGradient>
    <clipPath id="emc"><rect width="48" height="48" rx="13"/></clipPath>
  </defs>
  <g clip-path="url(#emc)">
    <rect width="48" height="48" fill="url(#emg)"/>
    <path d="M17 8h14v5c0 5-3.1 8-7 8s-7-3-7-8z M13 10h4v2.5a4.2 4.2 0 0 1-4-2.5z M31 10h4a4.2 4.2 0 0 1-4 2.5z M22.2 21h3.6v4.4h-3.6z M17.5 31.5h13v3h-13z" fill="#fff" opacity=".22"/>
    <text x="24" y="33" text-anchor="middle" font-family="Anton, Archivo, Arial" font-weight="700" font-size="22" fill="#fff">26</text>
    <g class="em-shine"><rect x="-34" y="-12" width="11" height="72" fill="#fff" opacity=".22" transform="rotate(18 24 24)"/></g>
  </g>
</svg>`;

/* ----------  user preferences: theme + reduced motion  ---------- */
const Prefs = (() => {
  function theme(){ return localStorage.getItem('wc26_theme') || 'dark'; }
  function motionReduced(){ const s=localStorage.getItem('wc26_motion'); if(s) return s==='reduced'; return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function apply(){
    document.documentElement.classList.toggle('light', theme()==='light');
    document.documentElement.classList.toggle('reduce-motion', motionReduced());
    const tb=document.getElementById('themeToggle'); if(tb) tb.textContent = theme()==='light'?'🌙':'☀️';
    const mb=document.getElementById('motionToggle'); if(mb){ mb.textContent = motionReduced()?'🟰':'〰️'; mb.classList.toggle('on', motionReduced()); }
  }
  function toggleTheme(){ localStorage.setItem('wc26_theme', theme()==='light'?'dark':'light'); apply(); }
  function toggleMotion(){ localStorage.setItem('wc26_motion', motionReduced()?'on':'reduced'); apply(); }
  return { theme, motionReduced, apply, toggleTheme, toggleMotion };
})();

/* ----------  flags  ---------- */
const TBD_FLAG = 'data:image/svg+xml,'+encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='60' height='40' fill='#1a2336'/><text x='30' y='26' text-anchor='middle' font-family='Arial' font-size='16' fill='#5c677d'>?</text></svg>");
const flag = cc => (!cc || cc==='un') ? TBD_FLAG : `https://flagcdn.com/${cc}.svg`;

/* ----------  generative stadium / scene art (inline SVG, never breaks)  ----------
   Produces a premium, deterministic illustration per city/venue so the site
   has zero broken images even offline. Real geographic maps are layered on top
   via Leaflet on the stadiums page. */
function hashHue(str){ let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))%360; return h; }
function stadiumArt(seed, label){
  const hue = hashHue(seed||'wc');
  const hue2 = (hue+48)%360;
  const sky1=`hsl(${hue},70%,16%)`, sky2=`hsl(${hue2},65%,9%)`;
  const glow=`hsl(${hue},90%,55%)`, turf=`hsl(140,55%,22%)`, turf2=`hsl(140,50%,16%)`;
  const stars = Array.from({length:18},()=>`<circle cx="${(Math.random()*800)|0}" cy="${(Math.random()*150)|0}" r="${Math.random()*1.4+.3}" fill="#fff" opacity="${(Math.random()*.6+.2).toFixed(2)}"/>`).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='520' viewBox='0 0 800 520'>
    <defs>
      <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='${sky1}'/><stop offset='1' stop-color='${sky2}'/>
      </linearGradient>
      <radialGradient id='lite' cx='.5' cy='.1' r='.9'>
        <stop offset='0' stop-color='${glow}' stop-opacity='.55'/><stop offset='1' stop-color='${glow}' stop-opacity='0'/>
      </radialGradient>
      <linearGradient id='turf' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stop-color='${turf}'/><stop offset='1' stop-color='${turf2}'/>
      </linearGradient>
    </defs>
    <rect width='800' height='520' fill='url(#sky)'/>
    ${stars}
    <rect width='800' height='520' fill='url(#lite)'/>
    <!-- stadium bowl -->
    <ellipse cx='400' cy='340' rx='430' ry='150' fill='hsl(${hue},25%,12%)'/>
    <ellipse cx='400' cy='330' rx='340' ry='110' fill='hsl(${hue},30%,18%)'/>
    <ellipse cx='400' cy='330' rx='250' ry='78' fill='url(#turf)'/>
    <!-- pitch lines -->
    <ellipse cx='400' cy='330' rx='250' ry='78' fill='none' stroke='#ffffff' stroke-opacity='.25' stroke-width='2'/>
    <line x1='400' y1='252' x2='400' y2='408' stroke='#ffffff' stroke-opacity='.25' stroke-width='2'/>
    <circle cx='400' cy='330' r='34' fill='none' stroke='#ffffff' stroke-opacity='.25' stroke-width='2'/>
    <!-- floodlight beams -->
    <polygon points='90,90 150,70 360,300 250,310' fill='${glow}' opacity='.07'/>
    <polygon points='710,90 650,70 440,300 550,310' fill='${glow}' opacity='.07'/>
    <!-- light towers -->
    <g fill='${glow}'>
      <rect x='80' y='60' width='10' height='120' opacity='.5'/><circle cx='85' cy='58' r='10'/>
      <rect x='710' y='60' width='10' height='120' opacity='.5'/><circle cx='715' cy='58' r='10'/>
    </g>
    <text x='400' y='486' text-anchor='middle' font-family='Oswald,Arial' font-weight='700' font-size='30' fill='#ffffff' fill-opacity='.92' letter-spacing='2'>${(label||'').toUpperCase()}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const cityImg = (key,label) => stadiumArt(key, label||key);

/* ----------  LOCAL TIME ENGINE  ----------
   Every kickoff is stored in UTC. We convert to the visitor's own zone. */
const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const tzAbbr = (() => {
  try{ return new Intl.DateTimeFormat('en-US',{timeZoneName:'short'}).formatToParts(new Date())
        .find(p=>p.type==='timeZoneName')?.value || ''; }catch(e){ return ''; }
})();

function localTime(iso){
  const d = new Date(iso);
  return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12:true});
}
function localDate(iso, opts){
  const d = new Date(iso);
  return d.toLocaleDateString([], opts || {weekday:'short', month:'short', day:'numeric'});
}
function localDateFull(iso){
  return new Date(iso).toLocaleDateString([], {weekday:'long', year:'numeric', month:'long', day:'numeric'});
}
function relativeKO(iso){
  const diff = new Date(iso) - new Date();
  if(diff < 0) return 'Now';
  const d=Math.floor(diff/864e5), h=Math.floor(diff%864e5/36e5), m=Math.floor(diff%36e5/6e4);
  if(d>0) return `in ${d}d ${h}h`;
  if(h>0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

/* ----------  TEAM / STADIUM lookups  ---------- */
const team = code => TEAM_BY_CODE[code] || {name:code||'TBD', cc:'un', code:code||'?', c1:'#333', c2:'#666', rank:'–'};
const stadium = id => STADIUMS.find(s=>s.id===id) || {name:'TBD', city:'', cc:'un'};

/* hex → rgba helper (kit-colour tints) */
function hexA(hex,a){ hex=(hex||'#888888').replace('#',''); if(hex.length===3) hex=hex.split('').map(x=>x+x).join(''); const n=parseInt(hex,16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }

/* ----------  player avatar (generated SVG, no external photo needed)  ---------- */
function avatarStyle(t){
  return `background:linear-gradient(150deg,${t.c1},${t.c2});color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.4)`;
}
function initials(name){
  const p=name.split(' '); return (p[0][0]+(p[p.length-1][0]||'')).toUpperCase();
}

/* ----------  STANDINGS computed from finished matches  ---------- */
function computeStandings(groupLetter){
  const teams = TEAMS.filter(t=>t.group===groupLetter);
  const row = {}; teams.forEach(t=>row[t.code]={code:t.code,P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0});
  MATCHES.filter(m=>m.group===groupLetter && m.hs!=null && m.as!=null && row[m.home] && row[m.away])
    .forEach(m=>{
      const h=row[m.home], a=row[m.away];
      h.P++;a.P++; h.GF+=m.hs;h.GA+=m.as; a.GF+=m.as;a.GA+=m.hs;
      if(m.hs>m.as){h.W++;a.L++;h.Pts+=3;}
      else if(m.hs<m.as){a.W++;h.L++;a.Pts+=3;}
      else{h.D++;a.D++;h.Pts++;a.Pts++;}
    });
  return Object.values(row).sort((x,y)=> y.Pts-x.Pts || (y.GF-y.GA)-(x.GF-x.GA) || y.GF-x.GF || team(x.code).rank-team(y.code).rank);
}

/* ----------  THIRD-PLACE RANKING & KNOCKOUT BRACKET PROJECTION  ----------
   Implements the official 2026 R32 slot structure. Group winners/runners-up
   resolve as each group completes; the eight best third-placed teams are
   ranked and assigned to their designated slots; W##/L## propagate from
   results. The live feed (openfootball) overrides projections with real
   names once FIFA confirms them. */
function groupComplete(g){ const ms=MATCHES.filter(m=>m.group===g); return ms.length>0 && ms.every(m=>m.hs!=null&&m.as!=null); }
function thirdPlaceTable(){
  const arr=GROUPS.filter(groupComplete).map(g=>{ const s=computeStandings(g)[2];
    return {group:g, code:s.code, Pts:s.Pts, GD:s.GF-s.GA, GF:s.GF}; });
  arr.sort((a,b)=> b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || team(a.code).rank-team(b.code).rank);
  return arr;
}
const THIRD_SLOTS=[[74,'ABCDF'],[77,'CDFGH'],[79,'CEFHI'],[80,'EHIJK'],[81,'BEFIJ'],[82,'AEHIJ'],[85,'EFGIJ'],[87,'DEIJL']];
function assignThirds(qGroups){           // perfect-matching of 8 qualifying groups to their slots
  const res={};
  (function bt(i,used){
    if(i===THIRD_SLOTS.length) return true;
    const [id,allowed]=THIRD_SLOTS[i];
    for(const g of qGroups){ if(used.has(g)||!allowed.includes(g)) continue;
      res[id]=g; used.add(g); if(bt(i+1,used)) return true; used.delete(g); delete res[id]; }
    return false;
  })(0,new Set());
  return Object.keys(res).length===THIRD_SLOTS.length?res:null;
}
function slotLabel(tok){
  if(!tok) return 'To be decided'; let m;
  if((m=tok.match(/^1([A-L])$/))) return 'Winner Group '+m[1];
  if((m=tok.match(/^2([A-L])$/))) return 'Runner-up '+m[1];
  if((m=tok.match(/^3([A-L]+)$/))) return '3rd: '+m[1].split('').join('/');
  if((m=tok.match(/^W(\d+)$/))) return 'Winner of #'+m[1];
  if((m=tok.match(/^L(\d+)$/))) return 'Loser of #'+m[1];
  return tok;
}
let _bracketProjected=false;
function resolveKnockout(){
  const map={};
  GROUPS.forEach(g=>{ if(groupComplete(g)){ const s=computeStandings(g); map['1'+g]=s[0].code; map['2'+g]=s[1].code; } });
  _bracketProjected=false;
  if(GROUPS.every(groupComplete)){
    const q=thirdPlaceTable().slice(0,8).map(x=>x.group);
    const a=assignThirds(q);
    if(a){ _bracketProjected=true; Object.entries(a).forEach(([id,g])=>{ const slot=MATCHES.find(m=>m.id==id).awaySlot; map[slot]=computeStandings(g)[2].code; }); }
  }
  const tok=(t)=>{ if(!t) return null; if(/^[12][A-L]$/.test(t)||/^3[A-L]+$/.test(t)||/^[WL]\d+$/.test(t)) return map[t]||null; return null; };
  for(let pass=0; pass<6; pass++){
    MATCHES.filter(m=>m.id>=73).forEach(m=>{
      m.homeLabel=slotLabel(m.homeSlot); m.awayLabel=slotLabel(m.awaySlot);
      if(!m._feed){ m.home=tok(m.homeSlot); m.away=tok(m.awaySlot); }
      if(m.home&&m.away&&m.hs!=null&&m.as!=null && m.hs!==m.as){
        const w=m.hs>m.as?m.home:m.away; map['W'+m.id]=w; map['L'+m.id]=(w===m.home?m.away:m.home);
      }
    });
  }
}

/* ----------  team-or-label for knockout TBD slots  ---------- */
function sideTeam(code,label){
  if(code) return team(code);
  return { name: label||'To be decided', cc:'un', code:'', c1:'#222', c2:'#444', rank:'–', tbd:true };
}

/* ----------  MATCH CARD renderer  ---------- */
function scoreCell(v){ return (v==null) ? '–' : v; }
function matchCard(m){
  const h=sideTeam(m.home,m.homeLabel), a=sideTeam(m.away,m.awayLabel), st=stadium(m.stadium);
  const isLive = m.status==='live', done = m.status==='finished';
  const hasScore = m.hs!=null && m.as!=null;
  let scoreHtml;
  if(isLive){
    scoreHtml = `<div class="match-score">${hasScore?`${m.hs} <span class="vs">–</span> ${m.as}`:'<span class="vs">vs</span>'}
      <small style="color:var(--red);font-size:.66rem">${m.clockLabel||"LIVE"}</small></div>`;
  } else if(done){
    scoreHtml = `<div class="match-score">${hasScore?`${m.hs} <span class="vs">–</span> ${m.as}`:'<span class="vs">–</span>'}
      <small style="color:var(--muted);font-size:.66rem">FT</small></div>`;
  } else {
    scoreHtml = `<div class="match-score"><span class="ko">${localTime(m.kickoff)}<small>${localDate(m.kickoff)}</small></span></div>`;
  }
  const c = el('div','card match-card');
  c.innerHTML = `
    <div class="match-top">
      <span class="match-stage">${m.stage||''}</span>
      ${isLive?'<span class="live-badge">LIVE</span>':done?'<span class="muted">Full time</span>':`<span>${relativeKO(m.kickoff)}</span>`}
    </div>
    <div class="match-teams">
      <div class="mt-side">
        <img class="flag" src="${flag(h.cc)}" alt="${h.name}" loading="lazy">
        <div><div class="tn">${h.name}</div><div class="tc">${h.code}</div></div>
      </div>
      ${scoreHtml}
      <div class="mt-side away">
        <img class="flag" src="${flag(a.cc)}" alt="${a.name}" loading="lazy">
        <div><div class="tn">${a.name}</div><div class="tc">${a.code}</div></div>
      </div>
    </div>
    <div class="match-foot">
      <span>📍 ${st.name}, ${st.city}</span>
      ${isLive?`<a href="live.html?match=${m.id}">Watch live →</a>`:`<span>Details →</span>`}
    </div>`;
  c.style.cursor='pointer';
  c.addEventListener('click', e=>{ if(e.target.closest('a')) return; matchDetail(m); });
  return c;
}

/* ----------  FAVOURITES (follow teams, stored locally)  ---------- */
const FAV_KEY = 'wc26_favs';
function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY))||[]; }catch(e){ return []; } }
function isFav(code){ return getFavs().includes(code); }
function toggleFav(code){
  const f=getFavs(); const i=f.indexOf(code);
  if(i>=0) f.splice(i,1); else f.push(code);
  localStorage.setItem(FAV_KEY, JSON.stringify(f));
  return f.includes(code);
}

/* ----------  REAL photos + bios via Wikipedia REST (free, CORS-enabled)  ---------- */
const _wikiCache = {};
function wikiSummary(title){
  if(_wikiCache[title]!==undefined) return Promise.resolve(_wikiCache[title]);
  return fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {cache:'force-cache'})
    .then(r=>r.ok?r.json():null)
    .then(j=>{ const o = j ? {photo:(j.originalimage||j.thumbnail||{}).source||null, extract:j.extract||'', desc:j.description||''} : null; _wikiCache[title]=o; return o; })
    .catch(()=>{ _wikiCache[title]=null; return null; });
}
function wikiPhoto(title){ return wikiSummary(title).then(o=>o&&o.photo||null); }
function loadVenuePhoto(imgEl, wikiTitle){
  if(!wikiTitle||!imgEl) return;
  wikiPhoto(wikiTitle).then(src=>{ if(src){ const pre=new Image(); pre.onload=()=>{imgEl.src=src;}; pre.src=src; } });
}
/* player headshots — try Wikipedia, fall back to the generated avatar already shown */
function loadPlayerPhoto(imgEl, name){
  if(!imgEl) return;
  wikiPhoto(name).then(src=>{
    if(src){ const pre=new Image(); pre.onload=()=>{ imgEl.style.backgroundImage=`url('${src}')`; imgEl.classList.add('has-photo'); imgEl.textContent=''; }; pre.src=src; }
  });
}

/* ----------  ON-DEMAND full national squad (free TheSportsDB)  ---------- */
const _squadCache = {};
async function fetchNationalSquad(teamName){
  if(_squadCache[teamName]) return _squadCache[teamName];
  try{
    const sr = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,{cache:'force-cache'});
    const sj = await sr.json();
    const t = (sj.teams||[]).find(x=>x.strSport==='Soccer' && /national/i.test((x.strTeam||'')+(x.strDescriptionEN||'')))
            || (sj.teams||[]).find(x=>x.strSport==='Soccer');
    if(!t) { _squadCache[teamName]=null; return null; }
    const pr = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${t.idTeam}`,{cache:'force-cache'});
    const pj = await pr.json();
    const players = (pj.player||[]).map(p=>({
      name:p.strPlayer, pos:(p.strPosition||'').slice(0,12), num:p.strNumber||'', photo:p.strThumb||p.strCutout||null
    })).filter(p=>p.name);
    _squadCache[teamName]=players.length?players:null;
    return _squadCache[teamName];
  }catch(e){ _squadCache[teamName]=null; return null; }
}

/* ----------  VENUE WEATHER (open-meteo, free, no key, CORS)  ---------- */
const WX_CODE={0:['☀️','Clear'],1:['🌤️','Mainly clear'],2:['⛅','Partly cloudy'],3:['☁️','Overcast'],45:['🌫️','Fog'],48:['🌫️','Fog'],51:['🌦️','Light drizzle'],53:['🌦️','Drizzle'],55:['🌧️','Drizzle'],61:['🌧️','Light rain'],63:['🌧️','Rain'],65:['🌧️','Heavy rain'],71:['🌨️','Snow'],80:['🌦️','Showers'],81:['🌧️','Showers'],82:['⛈️','Heavy showers'],95:['⛈️','Thunderstorm'],96:['⛈️','Thunderstorm']};
const _wxCache={};
async function fetchVenueWeather(st, iso){
  const key=st.id+iso.slice(0,13);
  if(_wxCache[key]!==undefined) return _wxCache[key];
  try{
    const date=iso.slice(0,10);
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${st.lat}&longitude=${st.lng}&hourly=temperature_2m,weather_code&start_date=${date}&end_date=${date}&temperature_unit=celsius`;
    const r=await fetch(url,{cache:'force-cache'}); if(!r.ok){_wxCache[key]=null;return null;}
    const j=await r.json();
    const hours=j.hourly&&j.hourly.time||[]; const idx=hours.findIndex(h=>h.slice(0,13)===iso.slice(0,13));
    const i=idx>=0?idx:12;
    const temp=Math.round(j.hourly.temperature_2m[i]); const code=j.hourly.weather_code[i];
    const out={temp, code, emoji:(WX_CODE[code]||['🌡️','—'])[0], label:(WX_CODE[code]||['','—'])[1]};
    _wxCache[key]=out; return out;
  }catch(e){ _wxCache[key]=null; return null; }
}

/* ----------  PREDICTION model (transparent, ranking-based)  ---------- */
/* in-play win probability: blends pre-match ranking model with the live
   scoreline and minutes remaining (clearly a model, not official stats). */
function liveWinProb(m){
  const base=predictMatch(m);
  const c=(typeof LiveData!=='undefined')?LiveData.matchClock(m):{state:m.status,minute:0};
  const hs=m.hs||0, as=m.as||0, gd=hs-as;
  if(c.state==='upcoming'||m.hs==null) return base;
  if(c.state==='finished') return gd>0?{pH:100,pA:0,draw:0}:gd<0?{pH:0,pA:100,draw:0}:{pH:0,pA:0,draw:100};
  const progress=Math.min(1, c.minute/95), rem=1-progress;
  const lead=gd + (base.pH-base.pA)/45*rem;
  const sharp=1.3 + 4.2*progress;
  const pHwin=1/(1+Math.exp(-lead*sharp/2));
  let dr = gd===0 ? (0.30*rem+0.06) : (0.11*rem);
  const draw=Math.round(dr*100);
  let pH=Math.round((1-dr)*pHwin*100); let pA=100-draw-pH;
  return {pH:Math.max(0,pH), pA:Math.max(0,pA), draw};
}
function predictMatch(m){
  const h=team(m.home), a=team(m.away);
  const rh=h.rank||50, ra=a.rank||50;
  const sh=(100-rh)+6, sa=(100-ra);              // +6 home edge
  const total=sh+sa;
  let pH=Math.round(sh/total*100), pA=Math.round(sa/total*100);
  const draw=Math.max(14, 30-Math.abs(pH-pA)/2)|0;
  pH=Math.round(pH*(100-draw)/100); pA=100-draw-pH;
  return {pH,pA,draw};
}

/* ----------  ADD TO CALENDAR (.ics download, works everywhere free)  ---------- */
function downloadICS(m){
  const h=sideTeam(m.home,m.homeLabel), a=sideTeam(m.away,m.awayLabel), st=stadium(m.stadium);
  const dt=s=>new Date(s).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  const end=new Date(new Date(m.kickoff).getTime()+115*60000).toISOString();
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WC2026Hub//EN','BEGIN:VEVENT',
    `UID:wc26-${m.id}@hub`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(m.kickoff)}`,`DTEND:${dt(end)}`,
    `SUMMARY:${h.name} vs ${a.name} — ${m.stage||'World Cup 2026'}`,
    `LOCATION:${st.name}\\, ${st.city}\\, ${st.country}`,
    `DESCRIPTION:FIFA World Cup 2026 — ${m.stage||''}. Kick-off shown in your local time.`,
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url; link.download=`WC2026_${h.code||'TBD'}_${a.code||'TBD'}.ics`; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

/* ----------  MATCH DETAIL modal  ---------- */
function matchDetail(m){
  const h=sideTeam(m.home,m.homeLabel), a=sideTeam(m.away,m.awayLabel), st=stadium(m.stadium);
  const c = (typeof LiveData!=='undefined') ? LiveData.matchClock(m) : {state:m.status||'upcoming',label:''};
  const hasScore=m.hs!=null&&m.as!=null, known=m.home&&m.away;
  let centre;
  if(c.state==='upcoming') centre=`<div class="display" style="font-size:2.2rem">${localTime(m.kickoff)}</div><div class="muted" style="font-size:.8rem">${relativeKO(m.kickoff)}</div>`;
  else centre=`<div class="display" style="font-size:2.6rem">${hasScore?`${m.hs} – ${m.as}`:(c.state==='live'?'LIVE':'–')}</div><div style="font-size:.78rem;color:${c.state==='live'?'var(--red)':'var(--muted)'}">${c.state==='live'?c.label:'FULL TIME'}</div>`;
  const stars=code=>PLAYERS.filter(p=>p.team===code).slice(0,5);
  const lineupCol=(code,side)=>{
    const list=stars(code);
    if(!list.length) return `<div class="muted" style="font-size:.8rem;text-align:${side}">Line-up confirmed near kick-off</div>`;
    return list.map(p=>`<div class="lineup-row" style="${side==='right'?'flex-direction:row-reverse;text-align:right':''}"><span class="ln">${p.num}</span><b style="font-size:.85rem">${p.name}</b><span class="pos-badge pos-${p.pos}" style="margin-left:${side==='right'?'0':'auto'};margin-right:${side==='right'?'auto':'0'}">${p.pos}</span></div>`).join('');
  };
  let goalsHtml='';
  if(m.scorers && ((m.scorers.home||[]).length||(m.scorers.away||[]).length)){
    const all=[...(m.scorers.home||[]).map(g=>({...g,side:'home'})),...(m.scorers.away||[]).map(g=>({...g,side:'away'}))].sort((x,y)=>parseInt(x.minute)-parseInt(y.minute));
    goalsHtml=`<h3 class="display" style="font-size:1rem;margin:18px 0 8px">⚽ Goals</h3>`+
      all.map(g=>`<div class="lineup-row" style="${g.side==='away'?'flex-direction:row-reverse;text-align:right':''}"><span class="ln" style="color:var(--gold)">${g.minute}'</span><b style="font-size:.85rem">${g.name}</b><span style="margin-${g.side==='away'?'right':'left'}:auto;font-size:.72rem;color:var(--muted)">${(g.side==='home'?h:a).code}</span></div>`).join('')+
      (m.ht?`<div class="muted" style="font-size:.72rem;text-align:center;margin-top:6px">Half-time ${m.ht[0]}–${m.ht[1]}</div>`:'');
  }
  let predHtml='';
  if(known){ const w=predictMatch(m);
    predHtml=`<h3 class="display" style="font-size:1rem;margin:18px 0 8px">🔮 Win Probability</h3>
      <div class="sr-bar" style="height:14px"><span class="h" style="width:${w.pH}%"></span><span style="width:${w.draw}%;background:rgba(255,255,255,.18)"></span><span class="a" style="width:${w.pA}%"></span></div>
      <div style="display:flex;justify-content:space-between;font-size:.74rem;margin-top:5px"><b>${h.code} ${w.pH}%</b><span class="muted">Draw ${w.draw}%</span><b>${w.pA}% ${a.code}</b></div>`;
  }
  showModal(`
    <div class="modal-hero" style="background:linear-gradient(120deg,${h.c1},${a.c2})">
      <div style="display:flex;align-items:center;gap:20px;color:#fff">
        <div style="text-align:center"><img src="${flag(h.cc)}" style="width:64px;height:43px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.5)"><div style="font-weight:700;margin-top:5px">${h.code||'TBD'}</div></div>
        <div style="text-align:center">${centre}</div>
        <div style="text-align:center"><img src="${flag(a.cc)}" style="width:64px;height:43px;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.5)"><div style="font-weight:700;margin-top:5px">${a.code||'TBD'}</div></div>
      </div></div>
    <div class="modal-body">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span class="pill pill-green">${m.stage||''}</span>
        ${c.state==='live'?'<span class="live-badge">LIVE</span>':''}
      </div>
      <h2 style="margin:10px 0 2px;font-size:1.3rem">${h.name} <span class="muted">vs</span> ${a.name}</h2>
      <p class="sub">📍 ${st.name}, ${st.city} · ${localDateFull(m.kickoff)} · ${localTime(m.kickoff)} ${tzAbbr}</p>
      ${goalsHtml}
      ${predHtml}
      ${known?`<h3 class="display" style="font-size:1rem;margin:18px 0 8px">📰 Related news</h3><div id="mdNews"><span class="muted" style="font-size:.84rem">Searching headlines…</span></div>`:''}
      ${known?`<h3 class="display" style="font-size:1rem;margin:18px 0 8px">👕 Players to watch</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div>${lineupCol(m.home,'left')}</div><div>${lineupCol(m.away,'right')}</div></div>`:''}
      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
        <button class="btn btn-gold" onclick='downloadICS(${JSON.stringify({id:m.id,home:m.home,away:m.away,homeLabel:m.homeLabel,awayLabel:m.awayLabel,stadium:m.stadium,kickoff:m.kickoff,stage:m.stage})})'>📅 Add to calendar</button>
        <a href="stadiums.html" class="btn btn-ghost">🗺️ Stadium &amp; map</a>
        <a href="live.html?match=${m.id}" class="btn btn-primary">🔴 Live center</a>
      </div>
    </div>`);
  if(known && typeof ensureNews==='function'){
    ensureNews().then(()=>{
      if(!window.NewsFeed) { const b=$('#mdNews'); if(b) b.innerHTML='<span class="muted" style="font-size:.84rem">News unavailable right now.</span>'; return; }
      NewsFeed.forMatch(h.name, a.name).then(items=>{
        const box=$('#mdNews'); if(!box) return;
        if(!items || !items.length){ box.innerHTML='<span class="muted" style="font-size:.84rem">No related headlines found yet.</span>'; return; }
        box.innerHTML=items.slice(0,5).map(n=>`<a class="md-news" href="${n.link}" target="_blank" rel="noopener">
          <span class="md-news-t">${n.title}</span>
          <span class="md-news-m">${n.src||''}${n.date?(' · '+localDate(n.date,{month:'short',day:'numeric'})):''} ↗</span></a>`).join('');
      });
    });
  }
}

/* ----------  KICK-OFF NOTIFICATIONS for followed teams  ---------- */
const Notif = (() => {
  const SEEN='wc26_notified';
  const seen = () => { try{ return JSON.parse(localStorage.getItem(SEEN))||{}; }catch(e){ return {}; } };
  const save = o => localStorage.setItem(SEEN, JSON.stringify(o));
  function enabled(){ return 'Notification' in window && Notification.permission==='granted' && localStorage.getItem('wc26_notif')==='on'; }
  function enable(){
    if(!('Notification' in window)){ alert('Your browser does not support notifications.'); return; }
    Notification.requestPermission().then(p=>{
      if(p==='granted'){ localStorage.setItem('wc26_notif','on'); new Notification('🏆 Alerts on!',{body:'We\'ll remind you when your followed teams kick off.'}); updateBell(); check(); }
    });
  }
  function disable(){ localStorage.setItem('wc26_notif','off'); updateBell(); }
  function updateBell(){ const b=document.getElementById('notifBell'); if(b){ b.classList.toggle('on', enabled()); b.title = enabled()?'Match alerts ON — click to mute':'Enable match alerts for followed teams'; } }
  const ICON='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E%F0%9F%8F%86%3C/text%3E%3C/svg%3E';
  function fire(title,body){
    if(!enabled()) return;
    try{
      // prefer the service worker so the alert can surface while backgrounded
      if(navigator.serviceWorker && navigator.serviceWorker.ready){
        navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body,icon:ICON,badge:ICON})).catch(()=>new Notification(title,{body,icon:ICON}));
      } else new Notification(title,{body,icon:ICON});
    }catch(e){ try{ new Notification(title,{body,icon:ICON}); }catch(_){} }
  }
  function check(){
    if(!enabled()) return;
    const favs=getFavs(); if(!favs.length) return;
    const s=seen(); const now=Date.now();
    MATCHES.filter(m=>m.home&&m.away&&(favs.includes(m.home)||favs.includes(m.away))).forEach(m=>{
      const ko=new Date(m.kickoff).getTime(), mins=(ko-now)/60000;
      const h=team(m.home), a=team(m.away);
      if(mins<=15 && mins>0 && !s['s'+m.id]){ s['s'+m.id]=1; fire('⏰ Kicking off soon',`${h.name} vs ${a.name} starts in ~${Math.round(mins)} min — ${localTime(m.kickoff)}`); }
      if(mins<=0 && mins>-3 && !s['k'+m.id]){ s['k'+m.id]=1; fire('🔴 Kick-off!',`${h.name} vs ${a.name} is starting now. Follow it live!`); }
    });
    save(s);
  }
  function toggle(){ enabled()?disable():enable(); }
  return { enable, disable, toggle, check, updateBell, enabled };
})();

/* ----------  HEADER / FOOTER injection (consistent across pages)  ---------- */
function buildChrome(active){
  const links = [
    ['index.html','Home'],['fixtures.html','Fixtures'],['bracket.html','Bracket'],['teams.html','Teams'],
    ['players.html','Players'],['stats.html','Stats'],['stadiums.html','Stadiums'],['news.html','News'],
    ['predictor.html','Predictor','pred-link'],['live.html','Live','live-link'],
  ];
  const header = el('header','site-header');
  header.innerHTML = `
    <div class="wrap nav">
      <a class="brand" href="index.html">
        <span class="logo">${BRAND_SVG}</span>
        <span>WORLD CUP <b>26</b><small>USA · CAN · MEX</small></span>
      </a>
      <nav class="nav-links" id="navLinks">
        ${links.map(([h,t,c])=>`<a href="${h}" class="${c||''} ${active===h?'active':''}">${t}</a>`).join('')}
      </nav>
      <div class="nav-right">
        <button class="icon-btn" id="themeToggle" aria-label="Toggle light/dark" title="Light / dark theme">☀️</button>
        <button class="icon-btn" id="motionToggle" aria-label="Toggle motion" title="Reduce motion">〰️</button>
        <button class="notif-bell" id="notifBell" aria-label="Match alerts" title="Enable match alerts">🔔</button>
        <span class="tz-badge" title="Times shown in your local zone">🕑 <b>${tzAbbr||'Local'}</b> ${USER_TZ.split('/').pop().replace('_',' ')}</span>
        <button class="burger" id="burger" aria-label="Menu">☰</button>
      </div>
    </div>`;
  document.body.prepend(header);
  $('#burger').onclick = () => $('#navLinks').classList.toggle('open');
  $('#notifBell').onclick = () => Notif.toggle();
  $('#themeToggle').onclick = () => Prefs.toggleTheme();
  $('#motionToggle').onclick = () => Prefs.toggleMotion();
  Prefs.apply();
  Notif.updateBell();
  Notif.check();
  setInterval(()=>Notif.check(), 60000);

  const footer = el('footer','site-footer');
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html" style="margin-bottom:14px">
            <span class="logo">${BRAND_SVG}</span><span>WORLD CUP <b>26</b></span>
          </a>
          <p>The complete matchday companion for the 2026 World Cup — 48 nations, 104 matches, live scores and standings, with every kick-off shown in your own time zone.</p>
        </div>
        <div><h5>Follow</h5>
          <a href="fixtures.html">Fixtures &amp; Results</a><a href="live.html">Live Match Center</a>
          <a href="stats.html">Stats &amp; Standings</a><a href="news.html">Latest News</a></div>
        <div><h5>Explore</h5>
          <a href="teams.html">Teams &amp; Groups</a><a href="players.html">Star Players</a>
          <a href="stadiums.html">Stadiums &amp; Maps</a><a href="index.html#format">Tournament Format</a></div>
        <div><h5>The Tournament</h5>
          <a href="#">June 11 – July 19, 2026</a><a href="#">16 Host Cities</a>
          <a href="#">3 Nations · 48 Teams</a><a href="#">Final: MetLife Stadium</a></div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 World Cup 26 · Independent matchday companion.</span>
        <span>All times shown in <b style="color:var(--green)">${USER_TZ}</b></span>
      </div>
    </div>`;
  document.body.appendChild(footer);

  // back-to-top button (all pages)
  const top=el('button','to-top','↑'); top.id='toTop'; top.title='Back to top'; top.setAttribute('aria-label','Back to top');
  top.onclick=()=>window.scrollTo({top:0,behavior:'smooth'}); document.body.appendChild(top);
  const onScroll=()=>{ top.classList.toggle('show', window.pageYOffset>500); };
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
}

/* ----------  World Bank Open Data (free, no key, CORS) — real country facts  ---------- */
const _ctryCache={};
function fetchCountry(cc){
  const code = (/^gb-/.test(cc) ? 'gb' : cc).toUpperCase();
  if(_ctryCache[code]!==undefined) return Promise.resolve(_ctryCache[code]);
  return fetch(`https://api.worldbank.org/v2/country/${code}?format=json`)
    .then(r=>r.ok?r.json():null)
    .then(async j=>{
      const c=(j && j[1] && j[1][0]) || null;
      if(!c || !c.name){ _ctryCache[code]=null; return null; }
      let population=null;
      try{ const pr=await fetch(`https://api.worldbank.org/v2/country/${code}/indicator/SP.POP.TOTL?format=json&mrnev=1`); const pj=await pr.json(); population=pj && pj[1] && pj[1][0] && pj[1][0].value; }catch(e){}
      const out={ capital:c.capitalCity||'', region:(c.region&&c.region.value||'').trim(), income:(c.incomeLevel&&c.incomeLevel.value||'').trim(), lat:+c.latitude||null, lng:+c.longitude||null, population };
      _ctryCache[code]=out; return out;
    })
    .catch(()=>{ _ctryCache[code]=null; return null; });
}

/* ----------  COUNTDOWN  ---------- */
function startCountdown(targetIso, mountSel){
  const mount = $(mountSel); if(!mount) return;
  function tick(){
    const diff = new Date(targetIso) - new Date();
    const past = diff<=0;
    const d=Math.max(0,Math.floor(diff/864e5)), h=Math.max(0,Math.floor(diff%864e5/36e5)),
          m=Math.max(0,Math.floor(diff%36e5/6e4)), s=Math.max(0,Math.floor(diff%6e4/1e3));
    const box=(v,l)=>`<div class="cd-box"><b>${String(v).padStart(2,'0')}</b><span>${l}</span></div>`;
    mount.innerHTML = past
      ? `<div class="cd-box" style="grid-column:span 4"><b style="color:var(--green)">KICK-OFF!</b><span>The World Cup is underway</span></div>`
      : box(d,'Days')+box(h,'Hours')+box(m,'Mins')+box(s,'Secs');
  }
  tick(); setInterval(tick,1000);
}

/* ----------  scroll reveal  ---------- */
function initReveal(){
  const nodes=$$('.reveal');
  if(!('IntersectionObserver' in window)){ nodes.forEach(n=>n.classList.add('in')); return; }
  // threshold 0 so any pixel entering reveals it (tall grids no longer stay hidden)
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);} }),{threshold:0, rootMargin:'0px 0px -8% 0px'});
  nodes.forEach(n=>io.observe(n));
  // safety net: never leave content hidden
  setTimeout(()=>nodes.forEach(n=>n.classList.add('in')), 1500);
}

/* ----------  generic modal  ---------- */
function closeModal(){ const ov=$('#modalOverlay'); if(ov) ov.classList.remove('open'); }
function showModal(html){
  let ov=$('#modalOverlay');
  if(!ov){ ov=el('div','modal-overlay'); ov.id='modalOverlay'; document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) closeModal(); }); }
  ov.innerHTML = `<div class="modal"><button class="modal-close" onclick="closeModal()">×</button>${html}</div>`;
  ov.classList.add('open');
}

/* lazy-load the shared news module on demand (so non-news pages don't ship it eagerly) */
function ensureNews(){
  if(window.NewsFeed) return Promise.resolve();
  return new Promise((res)=>{ const s=document.createElement('script'); s.src='js/news.js'; s.onload=()=>res(); s.onerror=()=>res(); document.head.appendChild(s); });
}

/* ----------  PWA: manifest, theme color, service worker  ---------- */
function initPWA(){
  if(!document.querySelector('link[rel="manifest"]')){
    const l=document.createElement('link'); l.rel='manifest'; l.href='manifest.webmanifest'; document.head.appendChild(l);
    const m=document.createElement('meta'); m.name='theme-color'; m.content='#9b3cff'; document.head.appendChild(m);
  }
  // bespoke emblem favicon
  const fav=document.querySelector('link[rel="icon"]');
  if(fav) fav.href='data:image/svg+xml,'+encodeURIComponent(BRAND_SVG.replace(' class="emblem"',''));
  // SW only works over http(s)/localhost (not file://)
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('sw.js').then(async reg=>{
      try{ if('periodicSync' in reg){ const s=await navigator.permissions.query({name:'periodic-background-sync'}); if(s.state==='granted') reg.periodicSync.register('wc-check',{minInterval:60*60*1000}); } }catch(e){}
    }).catch(()=>{});
  }
}
function syncSWState(){
  if(!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  const favs=getFavs();
  const matches=MATCHES.filter(m=>m.home&&m.away&&m.status!=='finished').map(m=>({id:m.id,home:m.home,away:m.away,h:team(m.home).name,a:team(m.away).name,ko:new Date(m.kickoff).getTime()}));
  navigator.serviceWorker.controller.postMessage({type:'state',payload:{favs,matches}});
}

/* ----------  boot  ---------- */
Prefs.apply();                                              // set theme/motion class ASAP (no flash)
if(typeof LiveData!=='undefined') LiveData.applyStatus();   // set real status before pages render
document.addEventListener('DOMContentLoaded', ()=>{
  initPWA();
  buildChrome(document.body.dataset.page);
  initReveal();
  setTimeout(syncSWState, 1500);
  setInterval(syncSWState, 5*60000);
});
