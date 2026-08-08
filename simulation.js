const CELL=5,COLS=120,ROWS=80,W=COLS*CELL,H=ROWS*CELL;
const EMPTY=0,SAPLING=1,SOFTWOOD=2,PIONEER=3,HARDWOOD=4,RESISTANT=5,FIRE=6,EMBER=7,INFECTED=8;

// keep old names as aliases so nothing breaks during transition
const NORM=SOFTWOOD,RES=RESISTANT;
const HIST=600;

const TREE_TYPES={
  [SOFTWOOD]: {fireRes:0.10, diseaseRes:0.75, softness:0.9,  growSpeed:1.4, color:'#aadd55', label:'Softwood'},
  [PIONEER]:  {fireRes:0.25, diseaseRes:0.25, softness:0.5,  growSpeed:2.5, color:'#66bb44', label:'Pioneer'},
  [HARDWOOD]: {fireRes:0.55, diseaseRes:0.20, softness:0.2,  growSpeed:0.6, color:'#8B5E3C', label:'Hardwood'},
  [RESISTANT]:{fireRes:0.55, diseaseRes:0.65, softness:0.05, growSpeed:0.5, color:'#8B3A3A', label:'Redwood'},
};

let grid=[],tick=0,seasonTick=0,seasonIdx=0;
let flashEffects=[],fireIntensity=1.0,fireIntensityLabel='';
let normHist=[],resHist=[],sapHist=[],fireHist=[],infHist=[];
let softHist=[],pionHist=[],hardHist=[],resistHist=[];
let agg={sumNorm:0,sumRes:0,sumSap:0,sumTotalTrees:0,samples:0,
  peakNorm:0,peakRes:0,peakFire:0,totalIgnitions:0,
  fireDuration:0,inFire:false,fireDurations:[],majorFires:0,passedMajorThreshold:false};

function rnd(n){return Math.floor(Math.random()*n);}
function rndF(){return Math.random();}
function makeCell(state){return{state,age:0,burnAge:0};}

function getSeasons(){
  if(!TOGGLES.seasons){
    
    const avg={name:'No Seasons',ticks:500,
      growRate:(PARAMS.springGrowRate+PARAMS.summerGrowRate+PARAMS.autumnGrowRate+PARAMS.winterGrowRate)/4,
      fireChance:(PARAMS.springFireChance+PARAMS.summerFireChance+PARAMS.autumnFireChance+PARAMS.winterFireChance)/4,
      rainChance:TOGGLES.rain?(PARAMS.springRainChance+PARAMS.summerRainChance+PARAMS.autumnRainChance+PARAMS.winterRainChance)/4:0,
      spread:(PARAMS.springSpread+PARAMS.summerSpread+PARAMS.autumnSpread+PARAMS.winterSpread)/4
    };
    return[avg];
  }
  return buildSeasons();
}

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

function initGrid(resFrac){
  grid=[];
  for(let r=0;r<ROWS;r++){grid[r]=[];for(let c=0;c<COLS;c++)grid[r][c]=makeCell(EMPTY);}
  const treeTypes=[SOFTWOOD,PIONEER,HARDWOOD,RESISTANT];
  for(let i=0;i<16;i++){
    const r=10+rnd(ROWS-20),c=10+rnd(COLS-20);
    grid[r][c]=makeCell(treeTypes[rnd(4)]);
  }
  tick=0;seasonTick=0;seasonIdx=0;flashEffects=[];
  normHist=[];resHist=[];sapHist=[];fireHist=[];infHist=[];
  softHist=[];pionHist=[];hardHist=[];resistHist=[];
  agg={sumNorm:0,sumRes:0,sumSap:0,sumTotalTrees:0,samples:0,
    peakNorm:0,peakRes:0,peakFire:0,totalIgnitions:0,
    fireDuration:0,inFire:false,fireDurations:[],majorFires:0,passedMajorThreshold:false};
  rollFI();
  if(TOGGLES.humans)initHumans();
}

function isTree(s){return s===SOFTWOOD||s===PIONEER||s===HARDWOOD||s===RESISTANT;}
function isBurnable(s){return isTree(s)||s===SAPLING;}

function pickSaplingType(r,c,g){
  // 15% chance of random mutation regardless of neighbors
  if(rndF()<0.15)return [SOFTWOOD,PIONEER,HARDWOOD,RESISTANT][rnd(4)];
  const mn=nbrs8(r,c).filter(([rr,cc])=>isTree(g[rr][cc].state));
  if(mn.length===0)return [SOFTWOOD,PIONEER,HARDWOOD,RESISTANT][rnd(4)];
  const counts={};
  mn.forEach(([rr,cc])=>{const s=g[rr][cc].state;counts[s]=(counts[s]||0)+1;});
  const roll=rndF()*mn.length;
  let acc=0;
  for(const[type,cnt] of Object.entries(counts)){
    acc+=cnt;
    if(roll<acc)return Number(type);
  }
  return Number(Object.keys(counts)[0]);
}

function stepGrid(g,sTick_,sIdx_,fi_,infOn,seasons_){
  const seasons=seasons_||getSeasons();
  const season=seasons[sIdx_%seasons.length];
  const fireActive=TOGGLES.fire;
  const fireChance=fireActive?season.fireChance*fi_:0;
  const spread=fireActive?Math.min(season.spread*fi_,.97):0;
  const next=[];
  for(let r=0;r<ROWS;r++){next[r]=[];for(let c=0;c<COLS;c++)next[r][c]={...g[r][c],age:g[r][c].age+1};}
  let newIgnitions=0;

  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell=g[r][c],s=cell.state;

      if(s===EMPTY){
        if(rndF()<season.growRate*PARAMS.growRateSpontaneous*PARAMS.growMultiplier)next[r][c]=makeCell(SAPLING);
        else{
          const tn=nbrs8(r,c).filter(([rr,cc])=>isTree(g[rr][cc].state)||g[rr][cc].state===SAPLING).length;
          if(tn>0&&rndF()<season.growRate*tn*PARAMS.growRateNeighbor*PARAMS.growMultiplier)next[r][c]=makeCell(SAPLING);
        }
      }

      else if(s===SAPLING){
        // assign type at first tick if not already set
        if(!cell.sapType){
          next[r][c].sapType=pickSaplingType(r,c,g);
        }
        const sapType=next[r][c].sapType||cell.sapType;
        const growSpeed=sapType?TREE_TYPES[sapType].growSpeed:1.0;
        const matureAge=Math.floor((PARAMS.saplingMatureAge+rnd(PARAMS.saplingMatureRand))/growSpeed);
        if(cell.age>matureAge){
          next[r][c].state=sapType||pickSaplingType(r,c,g);
        }
        if(spread>0){
          const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;
          if(fn>0&&rndF()<spread*PARAMS.fireSpreadSapling*fn){next[r][c]=makeCell(FIRE);newIgnitions++;}
        }
        if(rndF()<fireChance){next[r][c]=makeCell(FIRE);newIgnitions++;}
      }

      else if(isTree(s)){
        const tt=TREE_TYPES[s];
        // fire spread to this tree
        if(spread>0){
          const fn=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===FIRE).length;
          const fireProb=spread*fn*(1-tt.fireRes)*PARAMS.fireSpreadNorm;
          if(fn>0&&rndF()<fireProb){next[r][c]=makeCell(FIRE);newIgnitions++;}
        }
        // spontaneous ignition scaled by fire resistance
        if(rndF()<fireChance*(1-tt.fireRes)){next[r][c]=makeCell(FIRE);newIgnitions++;}
        // infection scaled by disease resistance and season
        // disease is stronger in autumn/winter when fire is low
        const seasonInfMult=[0.5,0.3,1.6,1.8][sIdx_%4]; // spring, summer, autumn, winter
        if(infOn){
          const infProb=PARAMS.infSpread*(1-tt.diseaseRes)*seasonInfMult;
          if(TOGGLES.spontInfection&&rndF()<PARAMS.infSpont*(1-tt.diseaseRes)*seasonInfMult)next[r][c]=makeCell(INFECTED);
          else if(TOGGLES.nbrSpread){
            const infN=nbrs8(r,c).filter(([rr,cc])=>g[rr][cc].state===INFECTED).length;
            if(infN>0&&rndF()<infProb*infN*PARAMS.infNbrsMult)next[r][c]=makeCell(INFECTED);
          }
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
        if(spread>0){
          const targets=nbrs4(r,c).filter(([rr,cc])=>isBurnable(g[rr][cc].state));
          if(targets.length&&rndF()<spread*PARAMS.fireEmberSpread){
            const[tr,tc]=targets[rnd(targets.length)];
            const ts=g[tr][tc].state;
            const fireRes=isTree(ts)?TREE_TYPES[ts].fireRes:0;
            if(rndF()>fireRes){next[tr][tc]=makeCell(FIRE);newIgnitions++;}
          }
        }
      }

      else if(s===INFECTED){
        next[r][c].burnAge=(cell.burnAge||0)+1;
        if(TOGGLES.nbrSpread){
          nbrs8(r,c).forEach(([rr,cc])=>{
            const ns=g[rr][cc].state;
            if(isTree(ns)){
              const diseaseRes=TREE_TYPES[ns].diseaseRes;
              if(rndF()<PARAMS.infSpread*PARAMS.infNbrsMult*(1-diseaseRes))next[rr][cc]=makeCell(INFECTED);
            }
          });
        }
        if((cell.burnAge||0)>PARAMS.infDeathMin+rnd(PARAMS.infDeathRand))next[r][c]=makeCell(EMPTY);
      }
    }
  }
  return{next,newIgnitions};
}

function step(){
  const seasons=getSeasons();
  const{next,newIgnitions}=stepGrid(grid,seasonTick,seasonIdx,fireIntensity,TOGGLES.infection,seasons);
  grid=next;

  let chopCt=0,plantCt=0;
  if(TOGGLES.humans){
    const counts=stepHumans(grid);
    chopCt=counts.chopCt;plantCt=counts.plantCt;
  }

  let softCt=0,pionCt=0,hardCt=0,resistCt=0,normCt=0,resCt=0,sapCt=0,fireCt=0,infCt=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const s=grid[r][c].state;
    if(s===SOFTWOOD)softCt++;
    else if(s===PIONEER)pionCt++;
    else if(s===HARDWOOD)hardCt++;
    else if(s===RESISTANT)resistCt++;
    else if(s===SAPLING)sapCt++;
    else if(s===FIRE)fireCt++;
    else if(s===INFECTED)infCt++;
  }
  normCt=softCt+pionCt;resCt=hardCt+resistCt;

  if(softCt+pionCt+hardCt+resistCt===0&&(seasonIdx===0||seasonIdx===3)){
    const cr=Math.floor(ROWS/2)+rnd(10)-5,cc=Math.floor(COLS/2)+rnd(10)-5;
    grid[cr][cc]=makeCell([SOFTWOOD,PIONEER,HARDWOOD,RESISTANT][rnd(4)]);
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
    softHist.push(softCt);pionHist.push(pionCt);hardHist.push(hardCt);resistHist.push(resistCt);
    if(normHist.length>HIST){normHist.shift();resHist.shift();sapHist.shift();fireHist.shift();infHist.shift();}
    if(softHist.length>HIST){softHist.shift();pionHist.shift();hardHist.shift();resistHist.shift();}
  }

  const seasons2=getSeasons();
  seasonTick++;
  if(seasonTick>=seasons2[seasonIdx%seasons2.length].ticks){
    seasonTick=0;seasonIdx=(seasonIdx+1)%seasons2.length;
    if(TOGGLES.seasons){
      if(seasonIdx===1)rollFI();
      else if(seasonIdx===0){fireIntensity=.5+Math.random()*.2;fireIntensityLabel='Moderate';}
      else{fireIntensity=.0;fireIntensityLabel='';}
    }
  }
  flashEffects=flashEffects.filter(f=>{f.age++;return f.age<10;});
  tick++;
  return{normCt,resCt,sapCt,fireCt,infCt,chopCt,plantCt};
}

function getTICKS_PER_YEAR(){
  return getSeasons().reduce((a,s)=>a+s.ticks,0);
}
