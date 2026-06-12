/* =====================================================================
   FIFA WORLD CUP 2026 — ANIMATED TACTICAL PITCH  (js/pitch.js)
   ---------------------------------------------------------------------
   Free, dependency-free 2D pitch. Real players in a formation; a slow,
   easy-to-follow passing ball with a glowing trail and a highlight ring
   on whoever has it; win-probability heat-tint; real GOAL MARKERS; goal
   REPLAYS (auto on finished matches, step/skip). Lineups enriched
   best-effort from the free TheSportsDB squad feed (fallback: curated
   players + formation template).

   ⚠️ Movement & passing are an ILLUSTRATIVE ANIMATION, not live tracking
   (no free positional data exists). Goals/markers/minutes are REAL.

   createPitch(canvas, match, {compact, autoReplay, onReplayState})
     -> { update, replayGoals, stopReplay, isReplaying, showGoal, goals,
          hasGoals, getPossession, formations, setOpt, destroy }
   ===================================================================== */
(function(global){
  'use strict';

  const FORMATIONS = {
    '4-3-3':[ ['GK',0.05,0.50],
      ['DF',0.20,0.14],['DF',0.20,0.38],['DF',0.20,0.62],['DF',0.20,0.86],
      ['MF',0.42,0.28],['MF',0.42,0.50],['MF',0.42,0.72],
      ['FW',0.66,0.22],['FW',0.70,0.50],['FW',0.66,0.78] ],
    '4-4-2':[ ['GK',0.05,0.50],
      ['DF',0.20,0.14],['DF',0.20,0.38],['DF',0.20,0.62],['DF',0.20,0.86],
      ['MF',0.44,0.14],['MF',0.44,0.38],['MF',0.44,0.62],['MF',0.44,0.86],
      ['FW',0.68,0.36],['FW',0.68,0.64] ],
    '4-2-3-1':[ ['GK',0.05,0.50],
      ['DF',0.19,0.14],['DF',0.19,0.38],['DF',0.19,0.62],['DF',0.19,0.86],
      ['MF',0.38,0.36],['MF',0.38,0.64],
      ['MF',0.58,0.20],['MF',0.58,0.50],['MF',0.58,0.80],
      ['FW',0.74,0.50] ],
  };
  const FORM_KEYS = Object.keys(FORMATIONS);
  function pickFormation(code){ let h=0; for(const ch of (code||'')) h=(h*31+ch.charCodeAt(0))%997; return FORM_KEYS[h%FORM_KEYS.length]; }
  function hexToRgb(hex){ const c=(hex||'#888').replace('#',''); const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
  function readable(hex){ const [r,g,b]=hexToRgb(hex); return (r*299+g*587+b*114)/1000>140?'#06140d':'#ffffff'; }
  function surname(name){ const p=(name||'').split(' '); return p[p.length-1]; }
  function roleFromFeedPos(s){ s=(s||'').toLowerCase();
    if(/goal|keeper/.test(s)) return 'GK';
    if(/back|defen/.test(s)) return 'DF';
    if(/midfield/.test(s)) return 'MF';
    if(/forward|wing|striker|attack/.test(s)) return 'FW';
    return 'MF'; }

  function buildSquad(code, side, feedPool){
    const t=(typeof team==='function')?team(code):{c1:'#2b6'};
    const tmpl=FORMATIONS[pickFormation(code)];
    const curated=(typeof PLAYERS!=='undefined')?PLAYERS.filter(p=>p.team===code):[];
    const byRole={GK:[],DF:[],MF:[],FW:[]}; curated.forEach(p=>(byRole[p.pos]||byRole.MF).push({num:p.num,name:p.name}));
    const feedByRole={GK:[],DF:[],MF:[],FW:[]}; (feedPool||[]).forEach(p=>feedByRole[roleFromFeedPos(p.pos)].push({num:p.num,name:p.name}));
    const used=new Set(curated.map(p=>p.name)); let auto=2;
    return tmpl.map(([role,x,y])=>{
      let pick=byRole[role]&&byRole[role].shift();
      if(!pick){ while(feedByRole[role]&&feedByRole[role].length){ const c=feedByRole[role].shift(); if(!used.has(c.name)){ pick=c; used.add(c.name); break; } } }
      const num=pick?(pick.num||''):(role==='GK'?1:auto++);
      const fx=side==='home'?x*0.48:(1-x*0.48);
      return { role,num,name:pick?pick.name:'',side,color:t.c1,ink:readable(t.c1),x:fx,y };
    });
  }

  function createPitch(canvas, match, opts){
    opts=opts||{};
    const compact=!!opts.compact;
    const view={ heat:true, markers:true, names:!compact };
    const ctx=canvas.getContext('2d');
    let W=0,H=0; const DPR=Math.min(global.devicePixelRatio||1,2);
    let nodes=[], ball=null, raf=null, running=false, visible=true, onScreen=true;
    let flash=0, banner=null, bannerT=0, lastScore='';
    let markers=[], replaying=false, replayTimer=null, M=match;
    let poolH=null, poolA=null, enrichedFor=null, autoPlayedFor=null;
    let holder=null, possEMA=0.5;
    let formH='4-3-3', formA='4-3-3', srcH='template', srcA='template';

    function resize(){ const cssW=canvas.clientWidth||canvas.parentElement.clientWidth||320; const cssH=compact?cssW*0.54:cssW*0.62; canvas.style.height=cssH+'px'; W=canvas.width=Math.round(cssW*DPR); H=canvas.height=Math.round(cssH*DPR); }
    function resizeIfNeeded(){ const cssW=canvas.clientWidth||canvas.parentElement.clientWidth||320; if(Math.abs(cssW*DPR-W)>2) resize(); }

    function goalsList(){ if(!M||!M.scorers) return [];
      const h=(M.scorers.home||[]).map(g=>({...g,side:'home'})), a=(M.scorers.away||[]).map(g=>({...g,side:'away'}));
      return [...h,...a].sort((x,y)=>parseInt(x.minute)-parseInt(y.minute)); }
    function computeMarkers(){ const gs=goalsList(),per={home:0,away:0}; markers=gs.map(g=>{ const i=per[g.side]++; return {x:g.side==='home'?0.90:0.10,y:0.30+(i%4)*0.13,minute:g.minute,name:g.name,side:g.side}; }); }

    function rebuild(){
      formH=pickFormation(M&&M.home); formA=pickFormation(M&&M.away);
      srcH=poolH&&poolH.length?'feed':'template'; srcA=poolA&&poolA.length?'feed':'template';
      nodes=(M&&M.home&&M.away)?[...buildSquad(M.home,'home',poolH),...buildSquad(M.away,'away',poolA)]:[];
      ball={x:0.5,y:0.5,tx:0.5,ty:0.5,speed:0.012,shot:false,dwell:0,trail:[]};
      holder=null; computeMarkers(); pickPass(true);
    }

    function possBias(){ try{ const w=(typeof liveWinProb==='function')?liveWinProb(M):{pH:50,pA:50}; return (w.pH||50)/((w.pH||50)+(w.pA||50)||1); }catch(e){ return 0.5; } }
    function pickPass(init){
      if(!nodes.length) return;
      const side=Math.random()<possBias()?'home':'away';
      const pool=nodes.filter(n=>n.side===side);
      if(!init && Math.random()<0.10){ const gx=side==='home'?0.985:0.015; ball.tx=gx; ball.ty=0.5+(Math.random()-0.5)*0.22; ball.shot=true; ball.speed=0.04; ball.targetNode=null; return; }
      const n=pool[(Math.random()*pool.length)|0]||nodes[0];
      ball.tx=n.x; ball.ty=n.y; ball.shot=false; ball.speed=0.009+Math.random()*0.006; ball.targetNode=n;
    }

    function celebrate(side,label){ const gx=side==='home'?0.985:0.015; ball.x=0.5;ball.y=0.5;ball.tx=gx;ball.ty=0.5;ball.shot=true;ball.speed=0.05;ball.dwell=0;ball.targetNode=null; flash=1; banner=label; bannerT=performance.now(); }
    function showGoal(i){ const gs=goalsList(); const g=gs[i]; if(!g) return; const t=(typeof team==='function')?team(g.side==='home'?M.home:M.away):{code:''}; celebrate(g.side,`${g.minute}'  ${g.name} (${t.code||''})`); }
    function replayGoals(){ const gs=goalsList(); if(!gs.length) return; stopReplay(); replaying=true; opts.onReplayState&&opts.onReplayState(true);
      let i=0; const step=()=>{ if(i>=gs.length){ stopReplay(); return; } showGoal(i++); }; step(); replayTimer=setInterval(step,2600); }
    function stopReplay(){ if(replayTimer){clearInterval(replayTimer);replayTimer=null;} if(replaying){ replaying=false; opts.onReplayState&&opts.onReplayState(false); } }

    function enrich(){ if(!M||!M.home||!M.away||enrichedFor===M.id) return; enrichedFor=M.id;
      if(typeof fetchNationalSquad!=='function'||typeof team!=='function') return;
      Promise.all([fetchNationalSquad(team(M.home).name),fetchNationalSquad(team(M.away).name)])
        .then(([h,a])=>{ if(M&&M.home&&M.away){ poolH=h&&h.length?h:poolH; poolA=a&&a.length?a:poolA; rebuild(); if(!running) staticDraw(); } }).catch(()=>{}); }

    /* ---------- drawing ---------- */
    function px(x){return x*W;} function py(y){return y*H;}
    function drawPitch(){
      const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b5e34'); g.addColorStop(1,'#073f23'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,.03)'; const n=10; for(let i=0;i<n;i+=2) ctx.fillRect(i*W/n,0,W/n,H);
      if(view.heat){ try{ const w=(typeof liveWinProb==='function')?liveWinProb(M):{pH:50,pA:50};
        const lh=Math.max(0,(w.pH-50)/50), rh=Math.max(0,(w.pA-50)/50);
        if(lh>0.02){ const gl=ctx.createLinearGradient(0,0,W*0.55,0); gl.addColorStop(0,`rgba(0,196,106,${0.20*lh})`); gl.addColorStop(1,'rgba(0,196,106,0)'); ctx.fillStyle=gl; ctx.fillRect(0,0,W,H); }
        if(rh>0.02){ const gr=ctx.createLinearGradient(W,0,W*0.45,0); gr.addColorStop(0,`rgba(255,210,76,${0.20*rh})`); gr.addColorStop(1,'rgba(255,210,76,0)'); ctx.fillStyle=gr; ctx.fillRect(0,0,W,H); } }catch(e){} }
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=Math.max(1,DPR); const m=6*DPR;
      ctx.strokeRect(m,m,W-2*m,H-2*m);
      ctx.beginPath(); ctx.moveTo(W/2,m); ctx.lineTo(W/2,H-m); ctx.stroke();
      ctx.beginPath(); ctx.arc(W/2,H/2,Math.min(W,H)*0.13,0,7); ctx.stroke();
      ctx.beginPath(); ctx.arc(W/2,H/2,2.5*DPR,0,7); ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fill();
      const bh=H*0.5,bw=W*0.13,by=(H-bh)/2; ctx.strokeRect(m,by,bw,bh); ctx.strokeRect(W-m-bw,by,bw,bh);
      const gh=H*0.22,gy=(H-gh)/2; ctx.strokeRect(m-4*DPR,gy,4*DPR,gh); ctx.strokeRect(W-m,gy,4*DPR,gh);
    }
    function drawMarkers(){ if(!view.markers) return; for(const mk of markers){ const x=px(mk.x),y=py(mk.y),r=Math.max(7*DPR,(compact?8:10)*DPR);
      ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle='rgba(255,210,76,.92)'; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1.4*DPR; ctx.stroke();
      ctx.fillStyle='#1a1200'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${Math.round(r*0.95)}px Arial`; ctx.fillText('⚽',x,y);
      ctx.fillStyle='rgba(255,255,255,.95)'; ctx.font=`700 ${Math.round(r*0.7)}px Inter, Arial`; ctx.fillText(mk.minute+"'",x,y-r-r*0.5); } }
    function drawNode(nd){ const x=px(nd.x),y=py(nd.y),r=Math.max(7*DPR,(compact?9:11)*DPR);
      const isHolder = holder===nd;
      if(isHolder){ ctx.beginPath(); ctx.arc(x,y,r*1.7,0,7); ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=2*DPR; ctx.stroke();
        ctx.beginPath(); ctx.arc(x,y,r*2.1,0,7); ctx.strokeStyle='rgba(255,210,76,.5)'; ctx.lineWidth=1.5*DPR; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(x,y+r*0.18,r*0.95,0,7); ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle=nd.color; ctx.fill(); ctx.lineWidth=1.6*DPR; ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.stroke();
      ctx.fillStyle=nd.ink; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`700 ${Math.round(r*0.95)}px Oswald, Arial`; ctx.fillText(String(nd.num),x,y+0.5*DPR);
      if(nd.name && view.names && W>320*DPR){ ctx.fillStyle='rgba(255,255,255,.95)'; ctx.font=`600 ${Math.round(r*0.74)}px Inter, Arial`; ctx.fillText(surname(nd.name),x,y+r+r*0.9); } }
    function drawBall(){ if(!ball) return;
      // trail
      for(let i=0;i<ball.trail.length;i++){ const p=ball.trail[i],a=(i+1)/ball.trail.length; const rr=Math.max(2*DPR,(compact?3:4)*DPR)*a; ctx.beginPath(); ctx.arc(px(p.x),py(p.y),rr,0,7); ctx.fillStyle=`rgba(255,255,255,${0.18*a})`; ctx.fill(); }
      const x=px(ball.x),y=py(ball.y),r=Math.max(5*DPR,(compact?5.5:7)*DPR);
      const gl=ctx.createRadialGradient(x,y,0,x,y,r*2.4); gl.addColorStop(0,'rgba(255,255,255,.55)'); gl.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(x,y,r*2.4,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle='#fff'; ctx.fill(); ctx.lineWidth=1.2*DPR; ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.stroke(); }
    function drawFlash(){ if(flash>0){ ctx.fillStyle=`rgba(255,210,76,${0.32*flash})`; ctx.fillRect(0,0,W,H); flash-=0.02; }
      if(banner && performance.now()-bannerT<2400){ const a=Math.min(1,(performance.now()-bannerT)/200); const bw=W*0.76,bx=(W-bw)/2,byy=H*0.40,bhh=H*0.2;
        ctx.fillStyle=`rgba(4,12,8,${0.8*a})`; ctx.fillRect(bx,byy,bw,bhh); ctx.strokeStyle='rgba(255,210,76,.9)'; ctx.lineWidth=2*DPR; ctx.strokeRect(bx,byy,bw,bhh);
        ctx.fillStyle='#ffd24c'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`700 ${Math.round(H*0.07)}px Oswald, Arial`; ctx.fillText('⚽ GOAL',W/2,byy+bhh*0.34);
        ctx.fillStyle='#fff'; ctx.font=`600 ${Math.round(H*0.05)}px Inter, Arial`; ctx.fillText(banner,W/2,byy+bhh*0.7);
      } else if(performance.now()-bannerT>=2400) banner=null; }

    let last=0;
    function frame(ts){ if(!running) return; const dt=Math.min(2,(ts-last)/16.7||1); last=ts;
      if(ball){
        if(ball.dwell>0){ ball.dwell-=dt; }
        else {
          const k=ball.speed*dt*(ball.shot?2.4:1)*6;
          ball.x+=(ball.tx-ball.x)*Math.min(0.25,k); ball.y+=(ball.ty-ball.y)*Math.min(0.25,k);
          if(Math.hypot(ball.tx-ball.x,ball.ty-ball.y)<0.008){
            if(ball.shot){ flash=Math.max(flash,0.4); holder=null; pickPass(false); }
            else { holder=ball.targetNode||null; ball.dwell=compact?22:34; pickPass(false); /* pickPass sets next target; dwell holds before moving */ }
          }
        }
        ball.trail.push({x:ball.x,y:ball.y}); if(ball.trail.length>(compact?10:14)) ball.trail.shift();
      }
      // possession EMA toward current holder's side
      const target = holder ? (holder.side==='home'?1:0) : possBias();
      possEMA += (target-possEMA)*0.02*dt;
      drawPitch(); drawMarkers(); nodes.forEach(drawNode); drawBall(); drawFlash();
      raf=requestAnimationFrame(frame);
    }
    function start(){ if(running||!visible||!onScreen||!nodes.length) return; running=true; last=performance.now(); raf=requestAnimationFrame(frame); }
    function stop(){ running=false; if(raf) cancelAnimationFrame(raf); raf=null; }
    function staticDraw(){ resizeIfNeeded(); drawPitch(); drawMarkers(); nodes.forEach(drawNode); drawBall(); }

    function onVis(){ visible=!document.hidden; visible?start():stop(); }
    document.addEventListener('visibilitychange',onVis);
    let io=null; if('IntersectionObserver' in global){ io=new IntersectionObserver(es=>{ onScreen=es[0].isIntersecting; onScreen?start():stop(); },{threshold:0.05}); io.observe(canvas); }
    const onResize=()=>{ resize(); if(!running) staticDraw(); }; global.addEventListener('resize',onResize);

    function maybeAutoReplay(){ if(!opts.autoReplay||autoPlayedFor===M.id) return;
      const finished=(typeof LiveData!=='undefined')?LiveData.matchClock(M).state==='finished':(M._final||false);
      if(finished&&goalsList().length){ autoPlayedFor=M.id; setTimeout(()=>{ if(M&&M.id===autoPlayedFor) replayGoals(); },700); } }

    resize(); rebuild(); staticDraw(); start(); enrich(); maybeAutoReplay();

    return {
      update(next){ const switched=!M||!next||M.id!==next.id; M=next;
        if(switched){ poolH=poolA=null; enrichedFor=null; rebuild(); lastScore=''; enrich(); maybeAutoReplay(); } else computeMarkers();
        const sc=(M&&M.hs!=null)?`${M.hs}-${M.as}`:'';
        if(sc&&lastScore&&sc!==lastScore){ const gs=goalsList(),g=gs[gs.length-1]; if(g){ const t=team(g.side==='home'?M.home:M.away); celebrate(g.side,`${g.minute}'  ${g.name} (${t.code||''})`); } }
        lastScore=sc; resizeIfNeeded(); if(!running) staticDraw(); },
      replayGoals, stopReplay, showGoal, isReplaying(){return replaying;}, hasGoals(){return goalsList().length>0;},
      goals(){ return goalsList(); },
      getPossession(){ return Math.round(possEMA*100); },
      formations(){ return {home:formH,away:formA,homeSrc:srcH,awaySrc:srcA}; },
      setOpt(k,v){ if(k in view){ view[k]=v; if(!running) staticDraw(); } },
      destroy(){ stopReplay(); stop(); document.removeEventListener('visibilitychange',onVis); global.removeEventListener('resize',onResize); if(io) io.disconnect(); }
    };
  }
  global.createPitch=createPitch;
})(window);
