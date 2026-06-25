const{Worker}=require('worker_threads');
const path=require('path');
const{createClient}=require('@supabase/supabase-js');

const SUPABASE_URL='https://dkooarbkotlxibvhmrhk.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrb29hcmJrb3RseGlidmhtcmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzU2OTYsImV4cCI6MjA5NzkxMTY5Nn0.xZJ3ANhM-AVIWSt5xWuu17P5CEkWfNRBeqh7cY774bg';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const EXPERIMENT_NAME='infSpread_vs_infDeathMin';

const INF_SPREAD_VALUES=[0.1,0.2,0.32,0.5,0.7];
const INF_DEATH_MIN_VALUES=[10,25,35,60,100];

const combinations=[];
for(const infSpread of INF_SPREAD_VALUES){
  for(const infDeathMin of INF_DEATH_MIN_VALUES){
    combinations.push({infSpread,infDeathMin});
  }
}

const MAX_WORKERS=4;
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
    worker.on('message',async(msg)=>{
      completedCount++;
      activeWorkers--;

      const{error}=await supabase.from('experiments').insert({
        experiment_name:EXPERIMENT_NAME,
        params:msg.combo,
        final_res:msg.result.finalRes,
        final_norm:msg.result.finalNorm,
        peak_res:msg.result.peakRes,
        peak_norm:msg.result.peakNorm
      });

      if(error){
        console.error(`Error saving combo infSpread=${msg.combo.infSpread} infDeathMin=${msg.combo.infDeathMin}:`,error.message);
      } else {
        console.log(`Done ${completedCount}/${combinations.length} — infSpread=${msg.combo.infSpread} infDeathMin=${msg.combo.infDeathMin} → finalRes=${msg.result.finalRes} finalNorm=${msg.result.finalNorm} (saved to Supabase)`);
      }

      if(completedCount===combinations.length){
        console.log('\nAll combinations complete and saved to Supabase.');
      } else {
        runNext();
      }
    });
    worker.on('error',(err)=>console.error('Worker error:',err));
  }
}

runNext();
