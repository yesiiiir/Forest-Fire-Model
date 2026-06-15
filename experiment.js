const EXP_YEARS=10;
const EXP_TICKS=EXP_YEARS*TICKS_PER_YEAR;
const EXP_RUNS=10;
const EXP_SAMPLE_EVERY=40;
const EXP_SAMPLES=Math.floor(EXP_TICKS/EXP_SAMPLE_EVERY);
const EXP_STEPS_PER_FRAME=80;

const CONDITIONS=[
  {label:'0% res',frac:0,color:'#e07840'},
  {label:'25% res',frac:.25,color:'#facc15'},
  {label:'50% res',frac:.5,color:'#2acc80'},
  {label:'75% res',frac:.75,color:'#38bdf8'},
];

let expRunning=false;
let expQueue=[];
let expQueueIdx=0;
let expRunIdx=0;
let expResults=[];
let expState=null;

let _savedGrid,_savedTick,_savedSeasonTick,_savedSeasonIdx,_savedFI,_savedFIL,_savedInfActive;
let _savedNormHist,_savedResHist,_savedSapHist,_savedFireHist,_savedInfHist,_savedAgg;

function startExperiment(){
  if(expRunning)return;
  const resFracVal=document.getElementById('expCondition').value;
  const infOnVal=+document.getElementById('expInfection').value;
  const frac=parseFloat(resFracVal);
  const cond=CONDITIONS.find(c=>c.frac===frac)||{label:Math.round(frac*100)+'% res',frac,color:'#aaaaaa'};
  const conditions=[{...cond,infOn:!!infOnVal,label:cond.label+(infOnVal?' +inf':'')}];
  expQueue=conditions;
  expQueueIdx=0;
  expRunIdx=0;
  expResults=[];
  expRunning=true;
  document.getElementById('expBtn').textContent='Running...';
  document.getElementById('expBtn').classList.add('running');

  _savedGrid=JSON.parse(JSON.stringify(grid));
  _savedTick=tick;_savedSeasonTick=seasonTick;_savedSeasonIdx=seasonIdx;
  _savedFI=fireIntensity;_savedFIL=fireIntensityLabel;
  _savedInfActive=infectionActive;
  _savedNormHist=[...normHist];_savedResHist=[...resHist];_savedSapHist=[...sapHist];
  _savedFireHist=[...fireHist];_savedInfHist=[...infHist];
  _savedAgg={...agg,fireDurations:[...agg.fireDurations]};

  startNextCondition();
}

function startNextCondition(){
  if(expQueueIdx>=expQueue.length){finishExperiment();return;}
  expRunIdx=0;
  expState={
    condIdx:expQueueIdx,
    runIdx:0,
    t:0,
    g:null,sTick:0,sIdx:0,fi:.5+Math.random()*.2,
    infOn:expQueue[expQueueIdx].infOn,
    resFrac:expQueue[expQueueIdx].frac,
    accum:new Array(EXP_SAMPLES).fill(0).map(()=>({res:0,norm:0})),
    samples:[]
  };
  startNewRun();
}

function startNewRun(){
  const cond=expQueue[expState.condIdx];
  let g=[];
  for(let r=0;r<ROWS;r++){
    g[r]=[];
    for(let c=0;c<COLS;c++){
      let state;
      if(cond.frac===0)state=NORM;
      else if(cond.frac===1)state=RES;
      else state=rndF()<cond.frac?RES:NORM;
      const cell=makeCell(state);
      cell.age=200+rnd(300);
      g[r][c]=cell;
    }
  }
  if(cond.infOn){
    let seeded=0;
    for(let r=0;r<ROWS&&seeded<5;r++)for(let c=0;c<COLS&&seeded<5;c++){
      if(g[r][c].state===RES&&rndF()<.12){g[r][c]=makeCell(INFECTED);seeded++;}
    }
  }
  expState.g=g;
  expState.t=0;expState.sTick=0;expState.sIdx=0;
  expState.fi=.5+Math.random()*.2;
  expState.samples=[];

  grid=expState.g.map(row=>row.map(c=>({...c})));
  normHist=[];resHist=[];sapHist=[];fireHist=[];infHist=[];
  tick=0;seasonTick=0;seasonIdx=0;fireIntensity=expState.fi;fireIntensityLabel='';

  const cond2=expQueue[expQueueIdx];
  document.getElementById('expProgress').textContent=
    `Condition: ${cond2.label} — Run ${expState.runIdx+1} of ${EXP_RUNS} (year 0–${EXP_YEARS})`;
}

function expTick(){
  if(!expRunning||!expState)return;
  const st=expState;

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
        updateExpChart();
        expQueueIdx++;
        startNextCondition();
        return;
      } else {
        expState.runIdx=st.runIdx;
        startNewRun();
        return;
      }
    }

    const{next,newIgnitions}=stepGrid(st.g,st.sTick,st.sIdx,st.fi,st.infOn);
    st.g=next;

    if(st.t%EXP_SAMPLE_EVERY===0){
      let rc=0,nc=0;
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        if(st.g[r][c].state===RES)rc++;
        else if(st.g[r][c].state===NORM)nc++;
      }
      st.samples.push({res:rc,norm:nc});
    }

    st.sTick++;
    if(st.sTick>=SEASONS[st.sIdx].ticks){
      st.sTick=0;st.sIdx=(st.sIdx+1)%SEASONS.length;
      if(st.sIdx===1){const rv=Math.random();if(rv<.6)st.fi=.35+Math.random()*.15;else if(rv<.9)st.fi=.55+Math.random()*.15;else st.fi=.75+Math.random()*.25;}
      else if(st.sIdx===0)st.fi=.5+Math.random()*.2;else st.fi=0;
    }
    st.t++;
  }

  grid=st.g.map(row=>row.map(c=>({...c})));
  let nc=0,rc=0,sc=0,fc=0,ic=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const s=grid[r][c].state;
    if(s===NORM)nc++;else if(s===RES)rc++;else if(s===SAPLING)sc++;else if(s===FIRE)fc++;else if(s===INFECTED)ic++;
  }
  normHist.push(nc);resHist.push(rc);sapHist.push(sc);fireHist.push(fc);infHist.push(ic);
  if(normHist.length>HIST){normHist.shift();resHist.shift();sapHist.shift();fireHist.shift();infHist.shift();}
  tick=st.t;seasonTick=st.sTick;seasonIdx=st.sIdx;fireIntensity=st.fi;

  const yr=Math.floor(st.t/TICKS_PER_YEAR);
  const cond2=expQueue[expQueueIdx]||{label:'?'};
  document.getElementById('expProgress').textContent=
    `Condition: ${cond2.label} — Run ${st.runIdx+1} of ${EXP_RUNS} — Year ${yr} / ${EXP_YEARS}`;
}

function finishExperiment(){
  expRunning=false;expState=null;
  document.getElementById('expBtn').textContent='Run experiment (10 runs)';
  document.getElementById('expBtn').classList.remove('running');
  document.getElementById('expProgress').textContent=`Done! ${expResults.length} condition(s) plotted.`;

  grid=_savedGrid;
  tick=_savedTick;seasonTick=_savedSeasonTick;seasonIdx=_savedSeasonIdx;
  fireIntensity=_savedFI;fireIntensityLabel=_savedFIL;
  infectionActive=_savedInfActive;
  normHist=[..._savedNormHist];resHist=[..._savedResHist];sapHist=[..._savedSapHist];
  fireHist=[..._savedFireHist];infHist=[..._savedInfHist];
  agg={..._savedAgg,fireDurations:[..._savedAgg.fireDurations]};
  updateInfBtn();
}
