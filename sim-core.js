const EMPTY=0,SAPLING=1,NORM=2,RES=3,FIRE=4,EMBER=5,INFECTED=6;
const COLS=120,ROWS=80;

const PARAMS={
  fireSpreadNorm:0.42,fireSpreadRes:0.07,fireSpreadSapling:0.55,
  fireEmberSpread:0.08,fireResEmberChance:0.12,
  infSpread:0.32,infNbrsMult:0.28,infSpont:0.00018,
  infDeathMin:35,infDeathRand:35,
  growMultiplier:1.0,growRateSpontaneous:0.03,growRateNeighbor:0.06,
  saplingMatureAge:180,saplingMatureRand:80,
  springTicks:500,summerTicks:500,autumnTicks:500,winterTicks:500,
  springGrowRate:0.001,springFireChance:0.0003,springRainChance:0.0,springSpread:0.18,
  summerGrowRate:0.001,summerFireChance:0.0018,summerRainChance:0.0,summerSpread:0.82,
  autumnGrowRate:0.001,autumnFireChance:0.0002,autumnRainChance:0.002,autumnSpread:0.10,
  winterGrowRate:0.001,winterFireChance:0.00005,winterRainChance:0.003,winterSpread:0.0,
};

const TOGGLES={infection:true,seasons:true,fire:true,nbrSpread:true,rain:true};

function rnd(n){return Math.floor(Math.random()*n);}
function rndF(){return Math.random();}
function makeCell(state){return{state,age:0,burnAge:0};}

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

function buildFullGrid(frac,infOn,P){
  P=P||PARAMS;
  let g=[];
  for(let r=0;r<ROWS;r++){
    g[r]=[];
    for(let c=0;c<COLS;c++){
      let state;
      if(frac===0)state=NORM;else if(frac===1)state=RES;else state=rndF()<frac?RES:NORM;
      const cell=makeCell(state);cell.age=200+rnd(P.saplingMatureAge);g[r][c]=cell;
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

function stepGrid(g,sIdx,fi,infOn,seasons,P){
  P=P||PARAMS;
  const season=seasons[sIdx%seasons.length];
  const fireChance=TOGGLES.fire?season.fireChance*fi:0;
  const spread=TOGGLES.fire?Math.min(season.spread*fi,.97):0;
  const next=[];
  for(let r=0;r<ROWS;r++){next[r]=[];for(let c=0;c<COLS;c++)next[r][c]={...g[r][c],age:g[r][c].age+1};}

  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell=g[r][c],s=cell.state;
      if(s===EMPTY){
        if(rndF()<season.growRate*P.growRateSpontaneous*P.growMultiplier)next[r][c]=makeCell(SAPLING);
        else{const tn=nbrs8(r,c).filter(([rr,cc])=>{const ns=g[rr][cc].state;return ns===NORM||ns===RES||ns===SAPLING;}).length;if(tn>0&&rndF()<season.growRate*tn*P.growRateNeighbor*P.growMultiplier)next[r][c]=makeCell(SAPLING);}
      }
      else if(s===SAPLING){
        if(cell.age>P.saplingMatureAge+rnd(P.saplingMatureRand)){const mn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===NORM||g[rr][cc].state===RES);if(mn.length===0)next[r][c].state=rndF()<.5?RES:NORM;else{const nc=mn.filter(([rr,cc])=>g[rr][cc].state===NORM).length;next[r][c].state=rndF()<nc/mn.length?NORM:RES;}}
        if(spread>0){const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;if(fn>0&&rndF()<spread*P.fireSpreadSapling*fn)next[r][c]=makeCell(FIRE);}
        if(rndF()<fireChance)next[r][c]=makeCell(FIRE);
      }
      else if(s===NORM){
        if(spread>0){const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;if(fn>0&&rndF()<spread*fn*P.fireSpreadNorm)next[r][c]=makeCell(FIRE);}
        if(rndF()<fireChance*1.2)next[r][c]=makeCell(FIRE);
      }
      else if(s===RES){
        if(spread>0){const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;if(fn>0&&rndF()<spread*fn*P.fireSpreadRes)next[r][c]=makeCell(FIRE);}
        if(rndF()<fireChance*.15)next[r][c]=makeCell(FIRE);
        if(infOn){
          if(rndF()<P.infSpont)next[r][c]=makeCell(INFECTED);
          else if(TOGGLES.nbrSpread){const infN=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===INFECTED).length;if(infN>0&&rndF()<P.infSpread*infN*.35)next[r][c]=makeCell(INFECTED);}
        }
      }
      else if(s===FIRE){
        next[r][c].burnAge=(cell.burnAge||0)+1;
        const rainChance=TOGGLES.rain?season.rainChance:0;
        if(rainChance>0&&rndF()<rainChance)next[r][c]=makeCell(EMBER);
        else if((cell.burnAge||0)>3+rnd(5))next[r][c]=makeCell(EMBER);
      }
      else if(s===EMBER){
        const rainChance=TOGGLES.rain?season.rainChance:0;
        if(rainChance>0&&rndF()<rainChance)next[r][c]=makeCell(EMPTY);
        else if(cell.age>6+rnd(8))next[r][c]=makeCell(EMPTY);
        if(spread>0){const targets=nbrs4(r,c).filter(([rr,cc])=>g[rr][cc].state===NORM||g[rr][cc].state===RES);if(targets.length&&rndF()<spread*P.fireEmberSpread){const[tr,tc]=targets[rnd(targets.length)];if(g[tr][tc].state===RES){if(rndF()<P.fireResEmberChance)next[tr][tc]=makeCell(FIRE);}else next[tr][tc]=makeCell(FIRE);}}
      }
      else if(s===INFECTED){
        next[r][c].burnAge=(cell.burnAge||0)+1;
        if(TOGGLES.nbrSpread)nbrs8(r,c).forEach(([rr,cc])=>{if(g[rr][cc].state===RES&&rndF()<P.infSpread*P.infNbrsMult)next[rr][cc]=makeCell(INFECTED);});
        if((cell.burnAge||0)>P.infDeathMin+rnd(P.infDeathRand))next[r][c]=makeCell(EMPTY);
      }
    }
  }
  return next;
}

function runSim(overrides){
  const P=Object.assign({},PARAMS,overrides);
  const EXP_YEARS=10;
  const seasons=[
    {name:'Spring',ticks:P.springTicks,growRate:P.springGrowRate,fireChance:P.springFireChance,rainChance:P.springRainChance,spread:P.springSpread},
    {name:'Summer',ticks:P.summerTicks,growRate:P.summerGrowRate,fireChance:P.summerFireChance,rainChance:P.summerRainChance,spread:P.summerSpread},
    {name:'Autumn',ticks:P.autumnTicks,growRate:P.autumnGrowRate,fireChance:P.autumnFireChance,rainChance:P.autumnRainChance,spread:P.autumnSpread},
    {name:'Winter',ticks:P.winterTicks,growRate:P.winterGrowRate,fireChance:P.winterFireChance,rainChance:P.winterRainChance,spread:P.winterSpread},
  ];
  const TICKS_PER_YEAR=seasons.reduce((a,s)=>a+s.ticks,0);
  const EXP_TICKS=EXP_YEARS*TICKS_PER_YEAR;
  const RUNS=10;
  const SAMPLE_EVERY=40;
  const NUM_SAMPLES=Math.floor(EXP_TICKS/SAMPLE_EVERY);

  const accumRes=new Array(NUM_SAMPLES).fill(0);
  const accumNorm=new Array(NUM_SAMPLES).fill(0);

  for(let run=0;run<RUNS;run++){
    let g=buildFullGrid(0.5,true,P);
    let sTick=0,sIdx=0,fi=0.5+Math.random()*0.2;
    const samplesRes=[],samplesNorm=[];

    for(let t=0;t<EXP_TICKS;t++){
      g=stepGrid(g,sIdx,fi,true,seasons,P);
      if(t%SAMPLE_EVERY===0){
        let rc=0,nc=0;
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if(g[r][c].state===RES)rc++;else if(g[r][c].state===NORM)nc++;}
        samplesRes.push(rc);samplesNorm.push(nc);
      }
      sTick++;
      if(sTick>=seasons[sIdx].ticks){
        sTick=0;sIdx=(sIdx+1)%seasons.length;
        if(sIdx===1){const rv=Math.random();if(rv<.6)fi=.35+Math.random()*.15;else if(rv<.9)fi=.55+Math.random()*.15;else fi=.75+Math.random()*.25;}
        else if(sIdx===0)fi=.5+Math.random()*.2;
        else if(sIdx===3)fi=0;
      }
    }
    for(let i=0;i<NUM_SAMPLES;i++){accumRes[i]+=samplesRes[i]||0;accumNorm[i]+=samplesNorm[i]||0;}
  }

  const avgRes=accumRes.map(v=>Math.round(v/RUNS));
  const avgNorm=accumNorm.map(v=>Math.round(v/RUNS));
  const finalRes=avgRes[avgRes.length-1];
  const finalNorm=avgNorm[avgNorm.length-1];
  const peakRes=avgRes.reduce((a,b)=>Math.max(a,b),0);
  const peakNorm=avgNorm.reduce((a,b)=>Math.max(a,b),0);
  return{finalRes,finalNorm,peakRes,peakNorm};
}

module.exports={runSim,PARAMS};
