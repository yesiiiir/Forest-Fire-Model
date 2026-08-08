const CHOPPER=0,PLANTER=1;

const HUMAN_PARAMS={
  initChoppers:12,
  initPlanters:12,
  maxChoppers:100,
  maxPlanters:100,
  chopTicks:80,
  plantTicks:15,
  chopStarveTicks:200,
  plantStarveTicks:150,
  chopReproduceAfter:5,
  plantReproduceAfter:8,
  fireStartChance:0.15,
};

let humans=[];
let chopperHist=[],planterHist=[];

const CHOPPER_BASES=[
  {r:Math.floor(ROWS*0.1),  c:Math.floor(COLS*0.1)},
  {r:Math.floor(ROWS*0.1),  c:Math.floor(COLS*0.4)},
  {r:Math.floor(ROWS*0.1),  c:Math.floor(COLS*0.7)},
  {r:Math.floor(ROWS*0.33), c:Math.floor(COLS*0.25)},
  {r:Math.floor(ROWS*0.33), c:Math.floor(COLS*0.55)},
  {r:Math.floor(ROWS*0.33), c:Math.floor(COLS*0.85)},
  {r:Math.floor(ROWS*0.6),  c:Math.floor(COLS*0.1)},
  {r:Math.floor(ROWS*0.6),  c:Math.floor(COLS*0.4)},
  {r:Math.floor(ROWS*0.6),  c:Math.floor(COLS*0.7)},
  {r:Math.floor(ROWS*0.85), c:Math.floor(COLS*0.25)},
  {r:Math.floor(ROWS*0.85), c:Math.floor(COLS*0.55)},
  {r:Math.floor(ROWS*0.85), c:Math.floor(COLS*0.85)},
];
const PLANTER_BASES=[
  {r:Math.floor(ROWS*0.1),  c:Math.floor(COLS*0.25)},
  {r:Math.floor(ROWS*0.1),  c:Math.floor(COLS*0.55)},
  {r:Math.floor(ROWS*0.1),  c:Math.floor(COLS*0.85)},
  {r:Math.floor(ROWS*0.33), c:Math.floor(COLS*0.1)},
  {r:Math.floor(ROWS*0.33), c:Math.floor(COLS*0.4)},
  {r:Math.floor(ROWS*0.33), c:Math.floor(COLS*0.7)},
  {r:Math.floor(ROWS*0.6),  c:Math.floor(COLS*0.25)},
  {r:Math.floor(ROWS*0.6),  c:Math.floor(COLS*0.55)},
  {r:Math.floor(ROWS*0.6),  c:Math.floor(COLS*0.85)},
  {r:Math.floor(ROWS*0.85), c:Math.floor(COLS*0.1)},
  {r:Math.floor(ROWS*0.85), c:Math.floor(COLS*0.4)},
  {r:Math.floor(ROWS*0.85), c:Math.floor(COLS*0.7)},
];

function makeHuman(type,r,c,baseIdx){
  const bases=type===CHOPPER?CHOPPER_BASES:PLANTER_BASES;
  const bi=baseIdx!==undefined?baseIdx:rnd(bases.length);
  return{
    type,r,c,baseIdx:bi,
    actionTicks:0,
    target:null,
    returning:false,
    working:false,
    seedType:null,
    starveTicker:0,
    successCount:0,
  };
}

function initHumans(){
  humans=[];
  chopperHist=[];planterHist=[];
  // spread evenly — at least 1 per base, then distribute remainder
  for(let i=0;i<Math.max(HUMAN_PARAMS.initChoppers,CHOPPER_BASES.length);i++){
    if(i>=HUMAN_PARAMS.initChoppers)break;
    const bi=i%CHOPPER_BASES.length;
    const base=CHOPPER_BASES[bi];
    humans.push(makeHuman(CHOPPER,base.r+rnd(5)-2,base.c+rnd(5)-2,bi));
  }
  for(let i=0;i<Math.max(HUMAN_PARAMS.initPlanters,PLANTER_BASES.length);i++){
    if(i>=HUMAN_PARAMS.initPlanters)break;
    const bi=i%PLANTER_BASES.length;
    const base=PLANTER_BASES[bi];
    humans.push(makeHuman(PLANTER,base.r+rnd(5)-2,base.c+rnd(5)-2,bi));
  }
}

function hasFire(r,c,g){
  for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){
    const rr=r+dr,cc=c+dc;
    if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&g[rr][cc].state===FIRE)return true;
  }
  return false;
}

function findNearestTree(r,c,g){
  const targeted=new Set(humans.filter(h=>h.type===CHOPPER&&h.target&&!h.returning).map(h=>`${h.target[0]},${h.target[1]}`));
  const candidates=[];
  for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){
    const s=g[rr][cc].state;
    if(!isTree(s)||hasFire(rr,cc,g)||targeted.has(`${rr},${cc}`))continue;
    const softness=TREE_TYPES[s].softness;
    const d=Math.abs(rr-r)+Math.abs(cc-c);
    candidates.push([rr,cc,d,softness]);
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>a[2]-b[2]);
  const top=candidates.slice(0,Math.max(1,Math.floor(candidates.length*0.3)));
  const totalWeight=top.reduce((a,x)=>a+x[3],0)||1;
  let roll=rndF()*totalWeight;
  for(const cand of top){roll-=cand[3];if(roll<=0)return[cand[0],cand[1]];}
  return[top[0][0],top[0][1]];
}

function findNearestEmpty(r,c,g){
  const targeted=new Set(humans.filter(h=>h.type===PLANTER&&h.target&&!h.returning).map(h=>`${h.target[0]},${h.target[1]}`));
  // prefer recently burned (ember) cells first, then fall back to empty
  let bestEmber=null,bestEmpty=null,bestEmberDist=Infinity,bestEmptyDist=Infinity;
  for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){
    const s=g[rr][cc].state;
    if(hasFire(rr,cc,g)||targeted.has(`${rr},${cc}`))continue;
    const d=Math.abs(rr-r)+Math.abs(cc-c);
    if(s===EMBER&&d<bestEmberDist){bestEmberDist=d;bestEmber=[rr,cc];}
    else if(s===EMPTY&&d<bestEmptyDist){bestEmptyDist=d;bestEmpty=[rr,cc];}
  }
  // strongly prefer ember — only use empty if no ember within reasonable range
  if(bestEmber&&bestEmberDist<80)return bestEmber;
  if(bestEmpty&&bestEmptyDist<60)return bestEmpty;
  return bestEmber||bestEmpty||null;
}

function pickSeedType(g){
  // count current population of each tree type
  const counts={[SOFTWOOD]:0,[PIONEER]:0,[HARDWOOD]:0,[RESISTANT]:0};
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const s=g[r][c].state;
    if(counts[s]!==undefined)counts[s]++;
  }
  const total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
  // weight inversely by population — rarer types get planted more
  const types=[SOFTWOOD,PIONEER,HARDWOOD,RESISTANT];
  const weights=types.map(t=>1-(counts[t]/total));
  const totalWeight=weights.reduce((a,b)=>a+b,0)||1;
  let roll=rndF()*totalWeight;
  for(let i=0;i<types.length;i++){roll-=weights[i];if(roll<=0)return types[i];}
  return types[rnd(4)];
}

function moveToward(h,tr,tc,g){
  const dr=Math.sign(tr-h.r);
  const dc=Math.sign(tc-h.c);
  const candidates=[];
  if(dr!==0&&dc!==0)candidates.push([h.r+dr,h.c+dc]);
  if(dr!==0)candidates.push([h.r+dr,h.c]);
  if(dc!==0)candidates.push([h.r,h.c+dc]);
  for(const[nr,nc] of candidates){
    if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!hasFire(nr,nc,g)){h.r=nr;h.c=nc;return;}
  }
  const fallback=[[h.r+1,h.c],[h.r-1,h.c],[h.r,h.c+1],[h.r,h.c-1]];
  for(const[nr,nc] of fallback){
    if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS){h.r=nr;h.c=nc;return;}
  }
}

function atBase(h,base){return Math.abs(h.r-base.r)<=1&&Math.abs(h.c-base.c)<=1;}

function stepHumans(g){
  const toRemove=new Set();
  const toAdd=[];

  humans.forEach((h,idx)=>{
    h.starveTicker++;
    const starveLim=h.type===CHOPPER?HUMAN_PARAMS.chopStarveTicks:HUMAN_PARAMS.plantStarveTicks;
    if(h.starveTicker>starveLim){toRemove.add(idx);return;}

    if(h.type===CHOPPER){
      if(h.returning){
        const base=CHOPPER_BASES[h.baseIdx%CHOPPER_BASES.length];
        if(atBase(h,base)){
          h.returning=false;
          // check reproduce
          if(h.successCount>=HUMAN_PARAMS.chopReproduceAfter){
            h.successCount=0;
            const chopCt=humans.filter(x=>x.type===CHOPPER).length+toAdd.filter(x=>x.type===CHOPPER).length;
            if(chopCt<HUMAN_PARAMS.maxChoppers)toAdd.push(makeHuman(CHOPPER,base.r+rnd(5)-2,base.c+rnd(5)-2,h.baseIdx));
          }
        } else {moveToward(h,base.r,base.c,g);}
        return;
      }
      if(!h.target||!isTree(g[h.target[0]][h.target[1]].state)||hasFire(h.target[0],h.target[1],g)){
        h.target=findNearestTree(h.r,h.c,g);h.working=false;h.actionTicks=0;
      }
      if(!h.target)return;
      if(h.r===h.target[0]&&h.c===h.target[1]){
        h.working=true;h.actionTicks++;
        if(h.actionTicks>=HUMAN_PARAMS.chopTicks){
          const[tr,tc]=h.target;
          if(isTree(g[tr][tc].state)){
            g[tr][tc]=rndF()<HUMAN_PARAMS.fireStartChance?{state:FIRE,age:0,burnAge:0}:{state:EMPTY,age:0,burnAge:0};
            h.successCount++;
            h.starveTicker=0;
          }
          h.actionTicks=0;h.working=false;h.target=null;h.returning=true;
        }
      } else {moveToward(h,h.target[0],h.target[1],g);}

    } else {
      if(h.returning){
        const base=PLANTER_BASES[h.baseIdx%PLANTER_BASES.length];
        if(atBase(h,base)){
          h.returning=false;
          h.seedType=pickSeedType(g);
          if(h.successCount>=HUMAN_PARAMS.plantReproduceAfter){
            h.successCount=0;
            const plantCt=humans.filter(x=>x.type===PLANTER).length+toAdd.filter(x=>x.type===PLANTER).length;
            if(plantCt<HUMAN_PARAMS.maxPlanters)toAdd.push(makeHuman(PLANTER,base.r+rnd(5)-2,base.c+rnd(5)-2,h.baseIdx));
          }
        } else {moveToward(h,base.r,base.c,g);}
        return;
      }
      if(!h.seedType)h.seedType=pickSeedType(g);
      if(!h.target||(g[h.target[0]][h.target[1]].state!==EMPTY&&g[h.target[0]][h.target[1]].state!==EMBER)||hasFire(h.target[0],h.target[1],g)){
        h.target=findNearestEmpty(h.r,h.c,g);h.working=false;h.actionTicks=0;
      }
      if(!h.target)return;
      if(h.r===h.target[0]&&h.c===h.target[1]){
        h.working=true;h.actionTicks++;
        if(h.actionTicks>=HUMAN_PARAMS.plantTicks){
          const[tr,tc]=h.target;
          if(g[tr][tc].state===EMPTY||g[tr][tc].state===EMBER){
            g[tr][tc]={state:h.seedType,age:200+rnd(100),burnAge:0};
            h.successCount++;
            h.starveTicker=0;
          }
          h.actionTicks=0;h.working=false;h.target=null;h.seedType=null;h.returning=true;
        }
      } else {moveToward(h,h.target[0],h.target[1],g);}
    }
  });

  humans=humans.filter((_,i)=>!toRemove.has(i));
  humans.push(...toAdd);

  const chopCt=humans.filter(h=>h.type===CHOPPER).length;
  const plantCt=humans.filter(h=>h.type===PLANTER).length;
  chopperHist.push(chopCt);planterHist.push(plantCt);
  if(chopperHist.length>HIST){chopperHist.shift();planterHist.shift();}
  return{chopCt,plantCt};
}

function drawHumans(ctx){
  CHOPPER_BASES.forEach(base=>{
    ctx.fillStyle='rgba(255,221,0,0.12)';
    ctx.fillRect(base.c*CELL-CELL*2,base.r*CELL-CELL*2,CELL*5,CELL*5);
  });
  PLANTER_BASES.forEach(base=>{
    ctx.fillStyle='rgba(68,170,255,0.12)';
    ctx.fillRect(base.c*CELL-CELL*2,base.r*CELL-CELL*2,CELL*5,CELL*5);
  });
  for(const h of humans){
    ctx.fillStyle=h.type===CHOPPER?'#ffdd00':'#44aaff';
    ctx.fillRect(h.c*CELL,h.r*CELL,CELL-1,CELL-1);
    if(h.working){
      ctx.fillStyle=h.type===CHOPPER?'rgba(255,100,0,0.8)':'rgba(0,200,100,0.8)';
      ctx.fillRect(h.c*CELL+1,h.r*CELL+1,CELL-3,CELL-3);
    }
    if(h.returning){
      ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.fillRect(h.c*CELL+1,h.r*CELL+1,CELL-3,CELL-3);
    }
  }
}
