const{Worker}=require('worker_threads');
const fs=require('fs');
const path=require('path');

const INF_SPREAD_VALUES=[0.1,0.2,0.32,0.5,0.7];
const INF_DEATH_MIN_VALUES=[10,25,35,60,100];

const combinations=[];
for(const infSpread of INF_SPREAD_VALUES){
  for(const infDeathMin of INF_DEATH_MIN_VALUES){
    combinations.push({infSpread,infDeathMin});
  }
}

const MAX_WORKERS=4;
const results=[];
let completedCount=0;
let activeWorkers=0;
let queueIdx=0;

console.log(`Running ${combinations.length} combinations (${MAX_WORKERS} parallel workers)...`);

function runNext(){
  while(activeWorkers<MAX_WORKERS&&queueIdx<combinations.length){
    const combo=combinations[queueIdx++];
    activeWorkers++;
    const worker=new Worker(path.join(__dirname,'worker.js'),{
      workerData:{
        combo,
        params:{infSpread:combo.infSpread,infDeathMin:combo.infDeathMin}
      }
    });
    worker.on('message',(msg)=>{
      completedCount++;
      activeWorkers--;
      results.push({...msg.combo,...msg.result});
      console.log(`Done ${completedCount}/${combinations.length} — infSpread=${msg.combo.infSpread} infDeathMin=${msg.combo.infDeathMin} → finalRes=${msg.result.finalRes} finalNorm=${msg.result.finalNorm}`);
      if(completedCount===combinations.length){
        saveResults();
      } else {
        runNext();
      }
    });
    worker.on('error',(err)=>console.error('Worker error:',err));
  }
}

function saveResults(){
  const headers=['infSpread','infDeathMin','finalRes','finalNorm','peakRes','peakNorm'];
  const rows=results.map(r=>headers.map(h=>r[h]).join(','));
  const csv=[headers.join(','),...rows].join('\n');
  const outPath=path.join(__dirname,'results.csv');
  fs.writeFileSync(outPath,csv);
  console.log(`\nDone! Results saved to results.csv`);
}

runNext();
