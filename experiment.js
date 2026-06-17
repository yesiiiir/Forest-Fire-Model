const EXP_YEARS=10;
const EXP_RUNS=10;
const EXP_SAMPLE_EVERY=40;
const EXP_STEPS_PER_FRAME=80;

function getEXP_TICKS(){return EXP_YEARS*(buildSeasons().reduce((a,s)=>a+s.ticks,0));}
function getEXP_SAMPLES(){return Math.floor(getEXP_TICKS()/EXP_SAMPLE_EVERY);}
const EXP_SAMPLES_FIXED=Math.floor((EXP_YEARS*2000)/EXP_SAMPLE_EVERY); 

const CONDITIONS=[
  {label:'0% res',frac:0,color:'#e07840'},
  {label:'25% res',frac:.25,color:'#facc15'},
  {label:'50% res',frac:.5,color:'#2acc80'},
  {label:'75% res',frac:.75,color:'#38bdf8'},
];

let expRunning=false;
let expQueue=[];
let expQueueIdx=0;
let expResults=[];
let expState=null;

let sweepRunning=false;
let sweepQueue=[];
let sweepQueueIdx=0;
let sweepResults=[];
let sweepState=null;

let _savedGrid,_savedTick,_savedSeasonTick,_savedSeasonIdx,_savedFI,_savedFIL;
let _savedNormHist,_savedResHist,_savedSapHist,_savedFireHist,_savedInfHist,_savedAgg;
let _savedToggles;

function saveSimState(){
  _savedGrid=JSON.parse(JSON.stringify(grid));
  _savedTick=tick;_savedSeasonTick=seasonTick;_savedSeasonIdx=seasonIdx;
  _savedFI=fireIntensity;_savedFIL=fireIntensityLabel;
  _savedNormHist=[...normHist];_savedResHist=[...resHist];_savedSapHist=[...sapHist];
  _savedFireHist=[...fireHist];_savedInfHist=[...infHist];
  _savedAgg={...agg,fireDurations:[...agg.fireDurations]};
  _savedToggles={...TOGGLES};
}

function restoreSimState(){
  grid=_savedGrid;
  tick=_savedTick;seasonTick=_savedSeasonTick;seasonIdx=_savedSeasonIdx;
  fireIntensity=_savedFI;fireIntensityLabel=_savedFIL;
  normHist=[..._savedNormHist];resHist=[..._savedResHist];sapHist=[..._savedSapHist];
  fireHist=[..._savedFireHist];infHist=[..._savedInfHist];
  agg={..._savedAgg,fireDurations:[..._savedAgg.fireDurations]};
  Object.assign(TOGGLES,_savedToggles);
  updateAllToggles();
}

function startExperiment(){
  if(expRunning||sweepRunning)return;
  const resFracVal=document.getElementById('expCondition').value;
  const infOnVal=+document.getElementById('expInfection').value;
  const frac=parseFloat(resFracVal);
  const cond=CONDITIONS.find(c=>c.frac===frac)||{label:Math.round(frac*100)+'% res',frac,color:'#aaaaaa'};
  expQueue=[{...cond,infOn:!!infOnVal,label:cond.label+(infOnVal?' +inf':'')}];
  expQueueIdx=0;expResults=[];
  expRunning=true;
  document.getElementById('expBtn').textContent='Running...';
  document.getElementById('expBtn').classList.add('running');
  saveSimState();
  startNextCondition();
}

function startNextCondition(){
  if(expQueueIdx>=expQueue.length){finishExperiment();return;}
  const EXP_SAMPLES=getEXP_SAMPLES();
  expState={
    condIdx:expQueueIdx,runIdx:0,t:0,
    g:null,sTick:0,sIdx:0,fi:.5+Math.random()*.2,
    infOn:expQueue[expQueueIdx].infOn,
    resFrac:expQueue[expQueueIdx].frac,
    accum:new Array(EXP_SAMPLES).fill(0).map(()=>({res:0,norm:0})),
    samples:[],
    seasons:buildSeasons()
  };
  startNewRun();
}

function startNewRun(){
  const cond=expQueue[expState.condIdx];
  const g=buildFullGrid(cond.frac,cond.infOn);
  expState.g=g;expState.t=0;expState.sTick=0;expState.sIdx=0;
  expState.fi=.5+Math.random()*.2;expState.samples=[];
  grid=expState.g.map(row=>row.map(c=>({...c})));
  normHist=[];resHist=[];sapHist=[];fireHist=[];infHist=[];
  tick=0;seasonTick=0;seasonIdx=0;fireIntensity=expState.fi;fireIntensityLabel='';
  const cond2=expQueue[expQueueIdx];
  document.getElementById('expProgress').textContent=
    `Condition: ${cond2.label} — Run ${expState.runIdx+1} of ${EXP_RUNS} (year 0–${EXP_YEARS})`;
}

function buildFullGrid(frac,infOn){
  let g=[];
  for(let r=0;r<ROWS;r++){
    g[r]=[];
    for(let c=0;c<COLS;c++){
      let state;
      if(frac===0)state=NORM;else if(frac===1)state=RES;else state=rndF()<frac?RES:NORM;
      const cell=makeCell(state);cell.age=200+rnd(300);g[r][c]=cell;
    }
  }
  if(infOn){
    let seeded=0;
    for(let r=0;r<ROWS&&seeded<5;r++)for(let c=0;c<COLS&&seeded<5;c++){
      if(g[r][c].state===RES&&rndF()<.12){g[r][c]=makeCell(INFECTED);seeded++;}
    }
  }
  return g;
}

function expTick(){
  if(!expRunning||!expState)return;
  const st=expState;
  const EXP_TICKS=getEXP_TICKS();
  const EXP_SAMPLES=getEXP_SAMPLES();

  for(let i=0;i<EXP_STEPS_PER_FRAME;i++){
    if(st.t>=EXP_TICKS){
      for(let j=0;j<EXP_SAMPLES;j++){
        st.accum[j].res+=(st.samples[j]?st.samples[j].res:0);
        st.accum[j].norm+=(st.samples[j]?st.samples[j].norm:0);
      }
      st.runIdx++;
      if(st.runIdx>=EXP_RUNS){
        const avgRes=st.accum.map(v=>Math.round(v.res/EXP_RUNS));
        const avgNorm=st.accum.map(v=>Math.round(v.norm/EXP_RUNS));
        expResults.push({label:expQueue[expQueueIdx].label,color:expQueue[expQueueIdx].color,dataRes:avgRes,dataNorm:avgNorm});
        updateExpChart();expQueueIdx++;startNextCondition();return;
      } else {expState.runIdx=st.runIdx;startNewRun();return;}
    }
    const{next}=stepGrid(st.g,st.sTick,st.sIdx,st.fi,st.infOn,st.seasons);
    st.g=next;
    if(st.t%EXP_SAMPLE_EVERY===0){
      let rc=0,nc=0;
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(st.g[r][c].state===RES)rc++;else if(st.g[r][c].state===NORM)nc++;}
      st.samples.push({res:rc,norm:nc});
    }
    st.sTick++;
    if(st.sTick>=st.seasons[st.sIdx%st.seasons.length].ticks){
      st.sTick=0;st.sIdx=(st.sIdx+1)%st.seasons.length;
      if(st.sIdx===1){const rv=Math.random();if(rv<.6)st.fi=.35+Math.random()*.15;else if(rv<.9)st.fi=.55+Math.random()*.15;else st.fi=.75+Math.random()*.25;}
      else if(st.sIdx===0)st.fi=.5+Math.random()*.2;else st.fi=0;
    }
    st.t++;
  }
  syncGridDisplay(st.g,st.t,st.sTick,st.sIdx,st.fi);
  const yr=Math.floor(st.t/getEXP_TICKS()*EXP_YEARS);
  const cond2=expQueue[expQueueIdx]||{label:'?'};
  document.getElementById('expProgress').textContent=
    `Condition: ${cond2.label} — Run ${st.runIdx+1} of ${EXP_RUNS} — Year ${yr} / ${EXP_YEARS}`;
}

function finishExperiment(){
  expRunning=false;expState=null;
  document.getElementById('expBtn').textContent='Run experiment (10 runs)';
  document.getElementById('expBtn').classList.remove('running');
  document.getElementById('expProgress').textContent=`Done! ${expResults.length} condition(s) plotted.`;
  restoreSimState();
}

function startSweep(){
  if(expRunning||sweepRunning)return;
  const paramKey=document.getElementById('sweepParam').value;
  const minVal=parseFloat(document.getElementById('sweepMin').value);
  const maxVal=parseFloat(document.getElementById('sweepMax').value);
  const stepVal=parseFloat(document.getElementById('sweepStep').value);
  const infOnVal=+document.getElementById('sweepInfection').value;
  const frac=parseFloat(document.getElementById('sweepCondition').value);

  if(isNaN(minVal)||isNaN(maxVal)||isNaN(stepVal)||stepVal<=0)return;

  sweepQueue=[];
  const colors=['#e07840','#facc15','#2acc80','#38bdf8','#bb44ff','#ff5500','#60a5fa','#f472b6','#a3e635','#fb923c'];
  let colorIdx=0;
  for(let v=minVal;v<=maxVal+stepVal*0.001;v+=stepVal){
    const val=Math.round(v*10000)/10000;
    sweepQueue.push({paramKey,paramVal:val,frac,infOn:!!infOnVal,
      label:`${SWEEP_PARAMS.find(p=>p.key===paramKey)?.label||paramKey}=${val}`,
      color:colors[colorIdx%colors.length]});
    colorIdx++;
  }

  sweepQueueIdx=0;sweepResults=[];sweepRunning=true;
  document.getElementById('sweepBtn').textContent='Running...';
  document.getElementById('sweepBtn').classList.add('running');
  saveSimState();
  startNextSweepCondition();
}

function startNextSweepCondition(){
  if(sweepQueueIdx>=sweepQueue.length){finishSweep();return;}
  const cond=sweepQueue[sweepQueueIdx];
  
  PARAMS[cond.paramKey]=cond.paramVal;
  const EXP_SAMPLES=getEXP_SAMPLES();
  sweepState={
    condIdx:sweepQueueIdx,runIdx:0,t:0,
    g:null,sTick:0,sIdx:0,fi:.5+Math.random()*.2,
    infOn:cond.infOn,resFrac:cond.frac,
    accum:new Array(EXP_SAMPLES).fill(0).map(()=>({res:0,norm:0})),
    samples:[],seasons:buildSeasons()
  };
  startNewSweepRun();
}

function startNewSweepRun(){
  const cond=sweepQueue[sweepState.condIdx];
  const g=buildFullGrid(cond.frac,cond.infOn);
  sweepState.g=g;sweepState.t=0;sweepState.sTick=0;sweepState.sIdx=0;
  sweepState.fi=.5+Math.random()*.2;sweepState.samples=[];
  grid=sweepState.g.map(row=>row.map(c=>({...c})));
  normHist=[];resHist=[];sapHist=[];fireHist=[];infHist=[];
  tick=0;seasonTick=0;seasonIdx=0;fireIntensity=sweepState.fi;fireIntensityLabel='';
  document.getElementById('sweepProgress').textContent=
    `${sweepQueue[sweepQueueIdx].label} — Run ${sweepState.runIdx+1} of ${EXP_RUNS} (${sweepQueueIdx+1}/${sweepQueue.length})`;
}

function sweepTick(){
  if(!sweepRunning||!sweepState)return;
  const st=sweepState;
  const EXP_TICKS=getEXP_TICKS();
  const EXP_SAMPLES=getEXP_SAMPLES();

  for(let i=0;i<EXP_STEPS_PER_FRAME;i++){
    if(st.t>=EXP_TICKS){
      for(let j=0;j<EXP_SAMPLES;j++){
        st.accum[j].res+=(st.samples[j]?st.samples[j].res:0);
        st.accum[j].norm+=(st.samples[j]?st.samples[j].norm:0);
      }
      st.runIdx++;
      if(st.runIdx>=EXP_RUNS){
        const avgRes=st.accum.map(v=>Math.round(v.res/EXP_RUNS));
        const avgNorm=st.accum.map(v=>Math.round(v.norm/EXP_RUNS));
        sweepResults.push({label:sweepQueue[sweepQueueIdx].label,color:sweepQueue[sweepQueueIdx].color,dataRes:avgRes,dataNorm:avgNorm});
        updateSweepChart();sweepQueueIdx++;startNextSweepCondition();return;
      } else {sweepState.runIdx=st.runIdx;startNewSweepRun();return;}
    }
    const{next}=stepGrid(st.g,st.sTick,st.sIdx,st.fi,st.infOn,st.seasons);
    st.g=next;
    if(st.t%EXP_SAMPLE_EVERY===0){
      let rc=0,nc=0;
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(st.g[r][c].state===RES)rc++;else if(st.g[r][c].state===NORM)nc++;}
      st.samples.push({res:rc,norm:nc});
    }
    st.sTick++;
    if(st.sTick>=st.seasons[st.sIdx%st.seasons.length].ticks){
      st.sTick=0;st.sIdx=(st.sIdx+1)%st.seasons.length;
      if(st.sIdx===1){const rv=Math.random();if(rv<.6)st.fi=.35+Math.random()*.15;else if(rv<.9)st.fi=.55+Math.random()*.15;else st.fi=.75+Math.random()*.25;}
      else if(st.sIdx===0)st.fi=.5+Math.random()*.2;else st.fi=0;
    }
    st.t++;
  }
  syncGridDisplay(st.g,st.t,st.sTick,st.sIdx,st.fi);
  document.getElementById('sweepProgress').textContent=
    `${sweepQueue[sweepQueueIdx]?.label||'?'} — Run ${st.runIdx+1} of ${EXP_RUNS} (${sweepQueueIdx+1}/${sweepQueue.length})`;
}

function finishSweep(){
  sweepRunning=false;sweepState=null;
  
  Object.assign(PARAMS,JSON.parse(JSON.stringify(_savedToggles&&PARAMS)));
  restoreSimState();
  document.getElementById('sweepBtn').textContent='Run sweep';
  document.getElementById('sweepBtn').classList.remove('running');
  document.getElementById('sweepProgress').textContent=`Done! ${sweepResults.length} value(s) plotted.`;
}

function syncGridDisplay(g,t,sTick,sIdx,fi){
  grid=g.map(row=>row.map(c=>({...c})));
  let nc=0,rc=0,sc=0,fc=0,ic=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const s=grid[r][c].state;
    if(s===NORM)nc++;else if(s===RES)rc++;else if(s===SAPLING)sc++;else if(s===FIRE)fc++;else if(s===INFECTED)ic++;
  }
  normHist.push(nc);resHist.push(rc);sapHist.push(sc);fireHist.push(fc);infHist.push(ic);
  if(normHist.length>HIST){normHist.shift();resHist.shift();sapHist.shift();fireHist.shift();infHist.shift();}
  tick=t;seasonTick=sTick;seasonIdx=sIdx;fireIntensity=fi;
}
