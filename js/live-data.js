/* =====================================================================
   FIFA WORLD CUP 2026 — LIVE DATA LAYER  (free, no API key)
   ---------------------------------------------------------------------
   Real data sources, all free & no key:
   1) openfootball/worldcup.json  (public domain, GitHub raw, CORS) —
      official results + auto-resolves the knockout bracket as it fills.
   2) TheSportsDB free feed (CORS) — in-play minute-level live scores.
   3) Clock fallback — status & live minute from the real kickoff time,
      so the site is always correct even fully offline.
   The UI never invents a scoreline: no data → shows real status only.
   ===================================================================== */
const LiveData = (() => {
  const STALE = 360;   // minutes after KO with no result before we stop calling a match "in play"
  const OF_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

  /* ---------- real match clock (feed-aware) ----------
     A match is only "finished" when the feed has a confirmed final result
     (m._final) — or 6h after KO if no data ever arrives. Otherwise, once KO
     passes it is "in play" (score fills from the feed). No bare "FT –". */
  function matchClock(m){
    const ko = new Date(m.kickoff).getTime(), now = Date.now();
    const elapsed = Math.floor((now - ko)/60000);
    if (elapsed < 0)  return { state:'upcoming', minute:0, label:'' };
    if (m._final)     return { state:'finished', minute:90, label:'FT' };
    if (elapsed >= STALE) return { state:'finished', minute:90, label:'FT' };
    let minute,label;
    if (elapsed<=45){ minute=Math.max(1,elapsed); label=minute+"'"; }
    else if (elapsed<=60){ minute=45; label='HT'; }
    else if (elapsed<=105){ minute=Math.min(90,elapsed-15); label=minute+"'"; }
    else { minute=90; label="90+'"; }
    return { state:'live', minute, label };
  }

  function applyStatus(){
    MATCHES.forEach(m=>{
      if(!m.home || !m.away){ if(m.status!=='finished') m.status='upcoming'; return; }
      const c = matchClock(m);
      m.minute=c.minute; m.clockLabel=c.label;
      m.status = c.state;
    });
  }

  /* ---------- team-name → code ---------- */
  const ALIAS = {
    'mexico':'MEX','south africa':'RSA','south korea':'KOR','korea republic':'KOR','czechia':'CZE','czech republic':'CZE',
    'canada':'CAN','bosnia and herzegovina':'BIH','bosnia & herzegovina':'BIH','qatar':'QAT','switzerland':'SUI',
    'brazil':'BRA','morocco':'MAR','haiti':'HAI','scotland':'SCO',
    'united states':'USA','usa':'USA','paraguay':'PAR','australia':'AUS','turkey':'TUR','turkiye':'TUR','türkiye':'TUR',
    'germany':'GER','curacao':'CUW','curaçao':'CUW','ivory coast':'CIV',"cote d'ivoire":'CIV',"côte d'ivoire":'CIV','ecuador':'ECU',
    'netherlands':'NED','japan':'JPN','sweden':'SWE','tunisia':'TUN',
    'belgium':'BEL','egypt':'EGY','iran':'IRN','ir iran':'IRN','new zealand':'NZL',
    'spain':'ESP','cape verde':'CPV','cabo verde':'CPV','saudi arabia':'KSA','uruguay':'URU',
    'france':'FRA','senegal':'SEN','iraq':'IRQ','norway':'NOR',
    'argentina':'ARG','algeria':'ALG','austria':'AUT','jordan':'JOR',
    'portugal':'POR','dr congo':'COD','congo dr':'COD','democratic republic of the congo':'COD','uzbekistan':'UZB','colombia':'COL',
    'england':'ENG','croatia':'CRO','ghana':'GHA','panama':'PAN',
  };
  const norm = s => (s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const toCode = name => ALIAS[norm(name)] || null;

  /* ---------- knockout placeholder → friendly label (e.g. "2A" → "Runner-up A") ---------- */
  function koLabel(token){
    if(!token) return 'To be decided';
    const t=String(token).trim();
    let mm;
    if((mm=t.match(/^1([A-L])$/i)))  return 'Winner Group '+mm[1].toUpperCase();
    if((mm=t.match(/^2([A-L])$/i)))  return 'Runner-up '+mm[1].toUpperCase();
    if((mm=t.match(/^3([A-L/]+)$/i)))return '3rd place '+mm[1].toUpperCase();
    if((mm=t.match(/^W\s?(\d+)$/i))) return 'Winner Match '+mm[1];
    if((mm=t.match(/^L\s?(\d+)$/i))) return 'Loser Match '+mm[1];
    if((mm=t.match(/^RU?(\d+)$/i)))  return 'Winner Match '+mm[1];
    return t;
  }

  /* ---------- PRIMARY: openfootball results + bracket resolution ---------- */
  async function fetchOpenFootball(){
    let changed=false;
    try{
      const res = await fetch(OF_URL, {cache:'no-store'});
      if(!res.ok) return false;
      const json = await res.json();
      (json.matches||[]).forEach(ev=>{
        const c1=toCode(ev.team1), c2=toCode(ev.team2);
        const ft = ev.score && ev.score.ft;
        const applyGoals=(m)=>{
          if(ev.score && ev.score.ht) m.ht=ev.score.ht;
          if(ev.goals1 || ev.goals2) m.scorers={ home:ev.goals1||[], away:ev.goals2||[] };
        };
        // KNOCKOUT — align by match number to our skeleton (ids 73-104)
        if(ev.num && ev.num>=73){
          const m=MATCHES.find(x=>x.id===ev.num);
          if(m){
            if(c1){ m.home=c1; m._feed=true; }
            if(c2){ m.away=c2; m._feed=true; }
            if(ft){ m.hs=ft[0]; m.as=ft[1]; m._final=true; m.status='finished'; changed=true; }
            applyGoals(m);
          }
          return;
        }
        // GROUP — align by team codes
        if(c1&&c2){
          const m=MATCHES.find(x=>x.home===c1 && x.away===c2);
          if(m){ if(ft){ m.hs=ft[0]; m.as=ft[1]; m._final=true; m.status='finished'; changed=true; } applyGoals(m); }
        }
      });
    }catch(e){ /* offline/blocked — fall back to clock status */ }
    return changed;
  }

  /* ---------- SECONDARY: TheSportsDB in-play live scores ---------- */
  async function fetchLiveScores(){
    // only call the (rate-limited) feed when a match is actually in its live window
    const now=Date.now();
    const active=MATCHES.filter(m=>m.home&&m.away&&!m._final&&(()=>{ const ko=+new Date(m.kickoff); return now>=ko-30*60000 && now<=ko+3*36e5; })());
    if(!active.length) return false;
    const days=[...new Set(active.map(m=>new Date(m.kickoff).toISOString().slice(0,10)))];   // only relevant day(s)
    const base='https://www.thesportsdb.com/api/v1/json/3/eventsday.php';
    let changed=false;
    for(const day of days){
      try{
        const res=await fetch(`${base}?d=${day}&s=Soccer`,{cache:'no-store'}); if(!res.ok) continue;
        const json=await res.json(); const events=(json&&json.events)||[];
        events.filter(e=>/world cup/i.test(e.strLeague||'')).forEach(e=>{
          const h=toCode(e.strHomeTeam), a=toCode(e.strAwayTeam); if(!h||!a) return;
          const m=MATCHES.find(x=>x.home===h&&x.away===a); if(!m) return;
          if(e.intHomeScore!=null&&e.intHomeScore!==''){ m.hs=+e.intHomeScore; m.as=+e.intAwayScore; changed=true; }
          const st=(e.strStatus||'').toLowerCase();
          if(/ft|finished|aet|after extra|pen/.test(st)){ m._final=true; m.status='finished'; }
          else if(/1h|2h|ht|live|in play|playing/.test(st)) m.status='live';
        });
      }catch(e){}
    }
    return changed;
  }

  /* ---------- public refresh ---------- */
  function resolve(){ applyStatus(); if(typeof resolveKnockout==='function'){ try{ resolveKnockout(); applyStatus(); }catch(e){} } }
  let lastOF=0;
  function refresh(onUpdate){
    resolve();
    if(typeof onUpdate==='function') onUpdate();
    const jobs=[];
    // openfootball (results + goalscorers) — refresh up to once a minute
    if(Date.now()-lastOF>55e3){ lastOF=Date.now(); jobs.push(fetchOpenFootball()); }
    jobs.push(fetchLiveScores());
    Promise.allSettled(jobs).then(()=>{ resolve(); if(typeof onUpdate==='function') onUpdate(); });
  }

  return { refresh, applyStatus, matchClock, toCode, koLabel, fetchOpenFootball };
})();
