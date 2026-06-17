const canvas=document.getElementById('c');
canvas.width=W; canvas.height=H;
const ctx=canvas.getContext('2d');

const SPEEDS=[1,2,4,8,16];
let stepsPerFrame=2,paused=false,lastTime=0;

const TOGGLE_DEFS=[
  {key:'infection',   id:'togInfection',  label:'Infection'},
  {key:'seasons',     id:'togSeasons',    label:'Seasons'},
  {key:'fire',        id:'togFire',       label:'Fire'},
  {key:'nbrSpread',   id:'togNbrSpread',  label:'Infection Spread'},
  {key:'rain',        id:'togRain',       label:'Rain'},
];

function updateToggleBtn(def){
  const b=document.getElementById(def.id);
  if(!b)return;
  const on=TOGGLES[def.key];
  b.textContent=`${def.label}: ${on?'ON':'OFF'}`;
  b.className=on?'ctrl-btn tog-on':'ctrl-btn tog-off';
}

function updateAllToggles(){
  TOGGLE_DEFS.forEach(updateToggleBtn);
}

TOGGLE_DEFS.forEach(def=>{
  const b=document.getElementById(def.id);
  if(!b)return;
  b.addEventListener('click',()=>{
    if(expRunning||sweepRunning)return;
    TOGGLES[def.key]=!TOGGLES[def.key];
    
    if(def.key==='infection'&&TOGGLES.infection){
      let seeded=0;
      for(let r=0;r<ROWS&&seeded<5;r++)for(let c=0;c<COLS&&seeded<5;c++){
        if(grid[r][c].state===RES&&rndF()<.12){grid[r][c]=makeCell(INFECTED);seeded++;}
      }
    }
    updateToggleBtn(def);
  });
});

document.getElementById('speedSlider').addEventListener('input',function(){
  stepsPerFrame=SPEEDS[+this.value-1];
  document.getElementById('speedLabel').textContent=['Slow','Med-Slow','Medium','Fast','Max'][+this.value-1];
});
document.getElementById('speedSlider').dispatchEvent(new Event('input'));

document.getElementById('pauseBtn').addEventListener('click',function(){
  paused=!paused;
  this.textContent=paused?'Resume':'Pause';
});

document.getElementById('resetBtn').addEventListener('click',()=>{
  if(expRunning||sweepRunning)return;
  resetParams();
  updateAllToggles();
  initGrid(0.5);
});

document.getElementById('sweepBtn').addEventListener('click',startSweep);
document.getElementById('sweepClear').addEventListener('click',()=>{
  if(sweepRunning)return;
  sweepResults=[];
  sweepChart.data.datasets=[];sweepChart.update('none');
  sweepChartNorm.data.datasets=[];sweepChartNorm.update('none');
  document.getElementById('sweepProgress').textContent='';
});

document.getElementById('sweepParam').addEventListener('change',function(){
  const p=PARAMETERS.find(p=>p.key===this.value);
  if(!p)return;
  document.getElementById('sweepMin').value=p.min;
  document.getElementById('sweepMax').value=p.max;
  document.getElementById('sweepStep').value=p.step;
  const defaultVal=PARAMS[p.key];
  document.getElementById('sweepDefault').textContent=`default: ${defaultVal}`;
});
document.getElementById('sweepParam').dispatchEvent(new Event('change'));

function draw(){
  ctx.fillStyle='#1a1208';ctx.fillRect(0,0,W,H);
  let normCt=0,resCt=0,sapCt=0,fireCt=0,infCt=0;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const s=grid[r][c].state;
      if(s===EMPTY)continue;
      if(s===NORM){normCt++;ctx.fillStyle='#8b3a10';}
      else if(s===RES){resCt++;ctx.fillStyle='#1a6b3c';}
      else if(s===SAPLING){sapCt++;ctx.fillStyle='#4a7a3a';}
      else if(s===FIRE){fireCt++;const fl=.7+Math.random()*.3;ctx.fillStyle=`rgb(${Math.floor(255*fl)},${Math.floor(55*fl)},0)`;}
      else if(s===EMBER){ctx.fillStyle='#2a0d00';}
      else if(s===INFECTED){infCt++;ctx.fillStyle='#7a2aaa';}
      ctx.fillRect(c*CELL,r*CELL,CELL-1,CELL-1);
    }
  }
  for(const f of flashEffects){
    const alpha=(1-f.age/10)*.7;
    ctx.fillStyle=f.type==='fire'?`rgba(255,220,50,${alpha})`:`rgba(100,180,255,${alpha})`;
    ctx.fillRect(f.c*CELL-CELL,f.r*CELL-CELL,CELL*3,CELL*3);
  }
  const seasons=getSeasons();
  const season=seasons[seasonIdx%seasons.length];
  const iStr=fireIntensityLabel?` · ${fireIntensityLabel}`:'';
  const TICKS_PER_YEAR=seasons.reduce((a,s)=>a+s.ticks,0);
  const currentYear=Math.floor(tick/TICKS_PER_YEAR)+1;

  document.getElementById('livebar').innerHTML=
    `<div class="lstat">Year: <span>${currentYear}</span></div>`+
    `<div class="lstat">Season: <span>${season.name}${iStr}</span></div>`+
    `<div class="lstat">Normal: <span class="norm-c">${normCt}</span></div>`+
    `<div class="lstat">Resistant: <span class="res-c">${resCt}</span></div>`+
    `<div class="lstat">Saplings: <span>${sapCt}</span></div>`+
    `<div class="lstat">Fire: <span class="fire-c">${fireCt}</span></div>`+
    (TOGGLES.infection?`<div class="lstat">Infected: <span class="inf-c">${infCt}</span></div>`:'');

  if(agg.samples>0){
    document.getElementById('avgNorm').textContent=Math.round(agg.sumNorm/agg.samples);
    document.getElementById('avgRes').textContent=Math.round(agg.sumRes/agg.samples);
    document.getElementById('avgSap').textContent=Math.round(agg.sumSap/agg.samples);
    document.getElementById('avgTotal').textContent=Math.round(agg.sumTotalTrees/agg.samples);
    document.getElementById('peakNorm').textContent=agg.peakNorm;
    document.getElementById('peakRes').textContent=agg.peakRes;
    document.getElementById('peakFire').textContent=agg.peakFire+' cells';
    document.getElementById('totalIgnitions').textContent=agg.totalIgnitions.toLocaleString();
    document.getElementById('majorFires').textContent=agg.majorFires;
    document.getElementById('infNow').textContent=TOGGLES.infection?infCt:'off';
    document.getElementById('curSeason').textContent=season.name+(fireIntensityLabel?' · '+fireIntensityLabel:'');
  }
}

function loop(timestamp){
  if(timestamp-lastTime>=16){
    if(sweepRunning){
      sweepTick();draw();updateCharts();
    } else if(expRunning){
      expTick();draw();updateCharts();
    } else if(!paused){
      for(let i=0;i<stepsPerFrame;i++)step();
      draw();
      if(chartTick%3===0)updateCharts();
    }
    chartTick++;lastTime=timestamp;
  }
  requestAnimationFrame(loop);
}

initGrid(0.5);
updateAllToggles();
requestAnimationFrame(loop);
