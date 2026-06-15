const CELL=5,COLS=120,ROWS=80,W=COLS*CELL,H=ROWS*CELL;
const EMPTY=0,SAPLING=1,NORM=2,RES=3,FIRE=4,EMBER=5,INFECTED=6;

const SEASONS=[
  {name:'Spring',ticks:500,growRate:.0014,fireChance:.0003,rainChance:.0,spread:.18},
  {name:'Summer',ticks:500,growRate:.0006,fireChance:.0018,rainChance:.0,spread:.82},
  {name:'Autumn',ticks:500,growRate:.001,fireChance:.0002,rainChance:.002,spread:.10},
  {name:'Winter',ticks:500,growRate:.0004,fireChance:.00005,rainChance:.003,spread:.0},
];
const TICKS_PER_YEAR=SEASONS.reduce((a,s)=>a+s.ticks,0);

const INF_SPREAD=0.32,INF_NBRS_MULT=0.28,INF_SPONT=0.00018,INF_DEATH_MIN=35,INF_DEATH_RAND=35;
const HIST=600;

let grid=[],tick=0,seasonTick=0,seasonIdx=0;
let flashEffects=[],fireIntensity=1.0,fireIntensityLabel='';
let infectionActive=false;
let normHist=[],resHist=[],sapHist=[],fireHist=[],infHist=[];
let agg={sumNorm:0,sumRes:0,sumSap:0,sumTotalTrees:0,samples:0,
  peakNorm:0,peakRes:0,peakFire:0,totalIgnitions:0,
  fireDuration:0,inFire:false,fireDurations:[],majorFires:0,passedMajorThreshold:false};

function rnd(n){return Math.floor(Math.random()*n);}
function rndF(){return Math.random();}
function makeCell(state){return{state,age:0,burnAge:0};}

function rollFI(){
  const r=Math.random();
  if(r<.6){fireIntensity=.35+Math.random()*.15;fireIntensityLabel='Mild';}
  else if(r<.9){fireIntensity=.55+Math.random()*.15;fireIntensityLabel='Moderate';}
  else{fireIntensity=.75+Math.random()*.25;fireIntensityLabel='Severe';}
}

function nbrs8(r,c){
  const o=[];
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
    if(!dr&&!dc)continue;
    const rr=r+dr,cc=c+dc;
    if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS)o.push([rr,cc]);
  }
  return o;
}
function nbrs4(r,c){
  return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([rr,cc])=>rr>=0&&rr<ROWS&&cc>=0&&cc<COLS);
}

function initGrid(resFrac,withInfection){
  grid=[];
  for(let r=0;r<ROWS;r++){grid[r]=[];for(let c=0;c<COLS;c++)grid[r][c]=makeCell(EMPTY);}
  for(let i=0;i<12;i++){
    const r=10+rnd(ROWS-20),c=10+rnd(COLS-20);
    grid[r][c]=makeCell(rndF()<(resFrac===undefined?.5:resFrac)?RES:NORM);
  }
  tick=0;seasonTick=0;seasonIdx=0;flashEffects=[];
  normHist=[];resHist=[];sapHist=[];fireHist=[];infHist=[];
  agg={sumNorm:0,sumRes:0,sumSap:0,sumTotalTrees:0,samples:0,
    peakNorm:0,peakRes:0,peakFire:0,totalIgnitions:0,
    fireDuration:0,inFire:false,fireDurations:[],majorFires:0,passedMajorThreshold:false};
  rollFI();
  if(withInfection!==undefined) infectionActive=!!withInfection;
}

function stepGrid(g,sTick_,sIdx_,fi_,infOn){
  const season=SEASONS[sIdx_];
  const fireChance=season.fireChance*fi_;
  const spread=Math.min(season.spread*fi_,.97);
  const next=[];
  for(let r=0;r<ROWS;r++){next[r]=[];for(let c=0;c<COLS;c++)next[r][c]={...g[r][c],age:g[r][c].age+1};}
  let newIgnitions=0;

  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell=g[r][c],s=cell.state;
      if(s===EMPTY){
        if(rndF()<season.growRate*.03){next[r][c]=makeCell(SAPLING);}
        else{
          const tn=nbrs8(r,c).filter(([rr,cc])=>{const ns=g[rr][cc].state;return ns===NORM||ns===RES||ns===SAPLING;}).length;
          if(tn>0&&rndF()<season.growRate*tn*.06)next[r][c]=makeCell(SAPLING);
        }
      }
      else if(s===SAPLING){
        if(cell.age>180+rnd(80)){
          const mn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===NORM||g[rr][cc].state===RES);
          if(mn.length===0)next[r][c].state=rndF()<.5?RES:NORM;
          else{const nc=mn.filter(([rr,cc])=>g[rr][cc].state===NORM).length;next[r][c].state=rndF()<nc/mn.length?NORM:RES;}
        }
        if(spread>0){const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;if(fn>0&&rndF()<spread*.55*fn){next[r][c]=makeCell(FIRE);newIgnitions++;}}
        if(rndF()<fireChance){next[r][c]=makeCell(FIRE);newIgnitions++;}
      }
      else if(s===NORM){
        if(spread>0){const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;if(fn>0&&rndF()<spread*fn*.42){next[r][c]=makeCell(FIRE);newIgnitions++;}}
        if(rndF()<fireChance*1.2){next[r][c]=makeCell(FIRE);newIgnitions++;}
      }
      else if(s===RES){
        if(spread>0){const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;if(fn>0&&rndF()<spread*fn*.07){next[r][c]=makeCell(FIRE);newIgnitions++;}}
        if(rndF()<fireChance*.15){next[r][c]=makeCell(FIRE);newIgnitions++;}
        if(infOn){
          if(rndF()<INF_SPONT){next[r][c]=makeCell(INFECTED);}
          else{const infN=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===INFECTED).length;if(infN>0&&rndF()<INF_SPREAD*infN*.35)next[r][c]=makeCell(INFECTED);}
        }
      }
      else if(s===FIRE){
        next[r][c].burnAge=(cell.burnAge||0)+1;
        if(season.rainChance>0&&rndF()<season.rainChance)next[r][c]=makeCell(EMBER);
        else if((cell.burnAge||0)>3+rnd(5))next[r][c]=makeCell(EMBER);
      }
      else if(s===EMBER){
        if(season.rainChance>0&&rndF()<season.rainChance)next[r][c]=makeCell(EMPTY);
        else if(cell.age>6+rnd(8))next[r][c]=makeCell(EMPTY);
        if(spread>0){
          const targets=nbrs4(r,c).filter(([rr,cc])=>g[rr][cc].state===NORM||g[rr][cc].state===RES);
          if(targets.length&&rndF()<spread*.08){
            const[tr,tc]=targets[rnd(targets.length)];
            if(g[tr][tc].state===RES){if(rndF()<.12){next[tr][tc]=makeCell(FIRE);newIgnitions++;}}
            else{next[tr][tc]=makeCell(FIRE);newIgnitions++;}
          }
        }
      }
      else if(s===INFECTED){
        next[r][c].burnAge=(cell.burnAge||0)+1;
        nbrs8(r,c).forEach(([rr,cc])=>{if(g[rr][cc].state===RES&&rndF()<INF_SPREAD*INF_NBRS_MULT)next[rr][cc]=makeCell(INFECTED);});
        if((cell.burnAge||0)>INF_DEATH_MIN+rnd(INF_DEATH_RAND))next[r][c]=makeCell(EMPTY);
      }
    }
  }
  return{next,newIgnitions};
}

function step(){
  const{next,newIgnitions}=stepGrid(grid,seasonTick,seasonIdx,fireIntensity,infectionActive);
  grid=next;

  let normCt=0,resCt=0,sapCt=0,fireCt=0,infCt=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const s=grid[r][c].state;
    if(s===NORM)normCt++;else if(s===RES)resCt++;else if(s===SAPLING)sapCt++;
    else if(s===FIRE)fireCt++;else if(s===INFECTED)infCt++;
  }
  if(normCt+resCt===0&&(seasonIdx===0||seasonIdx===3)){
    const cr=Math.floor(ROWS/2)+rnd(10)-5,cc=Math.floor(COLS/2)+rnd(10)-5;
    grid[cr][cc]=makeCell(rndF()<.5?NORM:RES);
  }

  agg.samples++;agg.sumNorm+=normCt;agg.sumRes+=resCt;agg.sumSap+=sapCt;agg.sumTotalTrees+=(normCt+resCt+sapCt);
  if(normCt>agg.peakNorm)agg.peakNorm=normCt;
  if(resCt>agg.peakRes)agg.peakRes=resCt;
  if(fireCt>agg.peakFire)agg.peakFire=fireCt;
  agg.totalIgnitions+=newIgnitions;
  if(fireCt>0){agg.fireDuration++;if(!agg.inFire)agg.inFire=true;if(fireCt>70)agg.passedMajorThreshold=true;}
  else{if(agg.inFire){agg.fireDurations.push(agg.fireDuration);agg.fireDuration=0;agg.inFire=false;if(agg.passedMajorThreshold){agg.majorFires++;agg.passedMajorThreshold=false;}}}

  if(tick%4===0){
    normHist.push(normCt);resHist.push(resCt);sapHist.push(sapCt);fireHist.push(fireCt);infHist.push(infCt);
    if(normHist.length>HIST){normHist.shift();resHist.shift();sapHist.shift();fireHist.shift();infHist.shift();}
  }

  seasonTick++;
  if(seasonTick>=SEASONS[seasonIdx].ticks){
    seasonTick=0;seasonIdx=(seasonIdx+1)%SEASONS.length;
    if(seasonIdx===1)rollFI();
    else if(seasonIdx===0){fireIntensity=.5+Math.random()*.2;fireIntensityLabel='Moderate';}
    else{fireIntensity=.0;fireIntensityLabel='';}
  }
  flashEffects=flashEffects.filter(f=>{f.age++;return f.age<10;});
  tick++;
  return{normCt,resCt,sapCt,fireCt,infCt};
}
