/* =====================================================================
   FIFA WORLD CUP 2026 — PREDICTOR GAME ENGINE  (js/predictor.js)
   ---------------------------------------------------------------------
   A free, offline (localStorage) prediction game. Predict scores, earn
   POINTS and fake COINS at model-derived ODDS, build streaks, level up,
   unlock badges and climb a leaderboard against rival managers. Predictions
   are auto-graded from REAL results (openfootball feed). No backend, no money.
   Depends on: MATCHES, team(), predictMatch() (app.js), LiveData.
   ===================================================================== */
const Predictor = (() => {
  const KEY='wc26_predictor_v1';
  const START_COINS=10000;
  const BOTS=[
    {name:'GoalGuru',skill:0.72},{name:'TheOracle',skill:0.68},{name:'PitchProphet',skill:0.64},
    {name:'TikiTakaTom',skill:0.60},{name:'SambaSage',skill:0.57},{name:'TheGaffer',skill:0.54},
    {name:'CatenaccioKid',skill:0.50},{name:'GroupStageGreg',skill:0.46},
  ];

  function fresh(){
    const bots={}; BOTS.forEach(b=>bots[b.name]={points:0,coins:START_COINS,correct:0,graded:0});
    return { coins:START_COINS, points:0, streak:0, bestStreak:0, correct:0, exact:0, graded:0,
             predictions:{}, gradedMatches:[], badges:[], bots };
  }
  let state=load();
  function load(){ try{ const s=JSON.parse(localStorage.getItem(KEY)); if(s&&s.bots) return s; }catch(e){} return fresh(); }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function reset(){ state=fresh(); save(); }

  /* ---- model-derived odds ---- */
  function probs(m){ try{ return predictMatch(m); }catch(e){ return {pH:40,pA:35,draw:25}; } }
  function odds(m){ const w=probs(m); const f=p=>Math.max(1.10, +(100/Math.max(5,p)*0.90).toFixed(2));
    return { H:f(w.pH), D:f(w.draw), A:f(w.pA) }; }

  /* ---- seeded RNG for deterministic bot behaviour ---- */
  function seed(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return ()=>{ h=Math.imul(h^h>>>16,2246822507); h=Math.imul(h^h>>>13,3266489909); return ((h^=h>>>16)>>>0)/4294967296; }; }

  function outcome(hs,as){ return hs>as?'H':hs<as?'A':'D'; }

  /* ---- Pick of the Day: the marquee upcoming match (2× points) ---- */
  function currentPOTD(){
    const ups=MATCHES.filter(m=>m.home&&m.away&&((typeof LiveData!=='undefined')?LiveData.matchClock(m).state:'upcoming')==='upcoming')
      .sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
    if(!ups.length) return null;
    const day=new Date(ups[0].kickoff).toISOString().slice(0,10);
    const sameDay=ups.filter(m=>new Date(m.kickoff).toISOString().slice(0,10)===day);
    sameDay.sort((a,b)=>(team(a.home).rank+team(a.away).rank)-(team(b.home).rank+team(b.away).rank));
    return sameDay[0].id;
  }

  /* ---- place / update a prediction (only for upcoming matches) ---- */
  function predict(matchId, pick, hs, as, stake){
    const m=MATCHES.find(x=>x.id===matchId); if(!m) return false;
    const st=(typeof LiveData!=='undefined')?LiveData.matchClock(m).state:'upcoming';
    if(st!=='upcoming') return false;
    stake=Math.max(0, Math.min(state.coins, stake|0));
    state.predictions[matchId]={ pick, hs:hs|0, as:as|0, stake, graded:false, potd:(currentPOTD()===matchId) };
    save(); return true;
  }
  function clearPrediction(matchId){ delete state.predictions[matchId]; save(); }

  /* ---- scoring ---- */
  function scorePts(pred, hs, as){
    const po=pred.pick, ao=outcome(hs,as);
    if(po!==ao) return 0;
    if(pred.hs===hs && pred.as===as) return 100;          // exact
    if((pred.hs-pred.as)===(hs-as)) return 60;            // right result + goal diff
    return 30;                                            // right result
  }

  /* ---- grade everything newly finished (user + bots) ---- */
  function grade(){
    const done=MATCHES.filter(m=>m.home&&m.away&&m.hs!=null&&m.as!=null);
    let changed=false; const userGraded=[];
    done.forEach(m=>{
      if(state.gradedMatches.includes(m.id)) return;
      const hs=m.hs, as=m.as, ao=outcome(hs,as), o=odds(m);
      // ---- user ----
      const p=state.predictions[m.id];
      if(p && !p.graded){
        let pts=scorePts(p,hs,as); const correct=(p.pick===ao);
        if(p.potd && correct) pts*=2;                          // Pick of the Day bonus
        let coinDelta=0;
        p.graded=true; p.pts=pts; p.result=`${hs}-${as}`; p.correct=correct;
        state.points+=pts; state.graded++;
        if(correct){ state.correct++; state.streak++; state.bestStreak=Math.max(state.bestStreak,state.streak);
          if(p.stake>0){ const payout=Math.round(p.stake*o[p.pick]); p.payout=payout; coinDelta=payout-p.stake; state.coins+=coinDelta; } }
        else { state.streak=0; if(p.stake>0){ coinDelta=-p.stake; state.coins+=coinDelta; p.payout=0; } }
        const exact=(p.hs===hs&&p.as===as); if(exact) state.exact++;
        userGraded.push({ id:m.id, correct, pts, coinDelta, exact, potd:!!p.potd });
      }
      // ---- rival managers ----
      BOTS.forEach(b=>{
        const r=seed(b.name+'#'+m.id);
        const w=probs(m); const roll=r()*100;
        let pick = roll<w.pH?'H':roll<w.pH+w.draw?'D':'A';
        if(r()>b.skill){ pick = ['H','D','A'][(r()*3)|0]; }      // skill miss → random
        const bt=state.bots[b.name]; bt.graded++;
        if(pick===ao){ bt.correct++; let pts=30; if(r()<b.skill*0.25) pts=100; else if(r()<b.skill*0.5) pts=60; bt.points+=pts; bt.coins+=Math.round(180*o[pick]); }
        else bt.coins-=160;
      });
      state.gradedMatches.push(m.id); changed=true;
    });
    if(changed){ checkBadges(); save(); }
    return { changed, userGraded };
  }

  /* ---- levels & badges ---- */
  function level(pts){ return Math.floor((pts==null?state.points:pts)/120)+1; }
  function title(lv){ lv=lv||level(); return lv>=12?'Legend':lv>=8?'Superstar':lv>=5?'Pro':lv>=3?'Amateur':'Rookie'; }
  function accuracy(){ return state.graded?Math.round(state.correct/state.graded*100):0; }
  const BADGE_DEFS=[
    {id:'first_win',icon:'✅',name:'First Win',desc:'Win your first prediction',test:s=>s.correct>=1},
    {id:'perfect',icon:'🎯',name:'Bullseye',desc:'Nail an exact scoreline',test:s=>s.exact>=1},
    {id:'streak3',icon:'🔥',name:'On Fire',desc:'3 correct in a row',test:s=>s.bestStreak>=3},
    {id:'streak5',icon:'🚀',name:'Unstoppable',desc:'5 correct in a row',test:s=>s.bestStreak>=5},
    {id:'sharp',icon:'🧠',name:'Sharp Eye',desc:'70%+ accuracy (5+ graded)',test:s=>s.graded>=5&&s.correct/s.graded>=0.7},
    {id:'rich',icon:'💰',name:'High Roller',desc:'Reach 20,000 coins',test:s=>s.coins>=20000},
    {id:'centurion',icon:'💯',name:'Centurion',desc:'Score 500 points',test:s=>s.points>=500},
    {id:'analyst',icon:'📊',name:'Analyst',desc:'Grade 10 predictions',test:s=>s.graded>=10},
  ];
  function checkBadges(){ BADGE_DEFS.forEach(b=>{ if(!state.badges.includes(b.id)&&b.test(state)){ state.badges.push(b.id); } }); }
  function badges(){ return BADGE_DEFS.map(b=>({...b,earned:state.badges.includes(b.id)})); }

  function leaderboard(){
    const rows=Object.entries(state.bots).map(([name,b])=>({name,points:b.points,coins:b.coins,acc:b.graded?Math.round(b.correct/b.graded*100):0,you:false}));
    rows.push({name:'You',points:state.points,coins:state.coins,acc:accuracy(),you:true});
    return rows.sort((a,b)=> b.points-a.points || b.coins-a.coins);
  }

  return { get state(){return state;}, load, save, reset, odds, predict, clearPrediction, grade,
           level, title, accuracy, badges, leaderboard, currentPOTD, BADGE_DEFS, START_COINS };
})();
