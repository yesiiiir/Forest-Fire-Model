const{Worker}=require('worker_threads');
const path=require('path');
const{createClient}=require('@supabase/supabase-js');

const SUPABASE_URL='https://dkooarbkotlxibvhmrhk.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrb29hcmJrb3RseGlidmhtcmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMzU2OTYsImV4cCI6MjA5NzkxMTY5Nn0.xZJ3ANhM-AVIWSt5xWuu17P5CEkWfNRBeqh7cY774bg';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const MAX_WORKERS=4;

function buildCombinations(paramRanges){
  const keys=Object.keys(paramRanges);
  let combos=[{}];
  for(const key of keys){
    const values=paramRanges[key];
    const next=[];
    for(const combo of combos){
      for(const v of values){
        next.push({...combo,[key]:v});
      }
    }
    combos=next;
  }
  return combos;
}

const EXPERIMENTS=[
  {
    name:'infSpread_vs_infDeathMin_wide',
    paramRanges:{
      infSpread:[0.05,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,0.97],
      infDeathMin:[5,15,30,45,60,75,90,110,130,150,180,220]
    }
  },
  {
    name:'fireSpread_vs_infSpread',
    paramRanges:{
      fireSpreadNorm:[0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.97],
      infSpread:[0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.97]
    }
  },
];

let expQueueIdx=0;

function runExperiment(experiment){
  return new Promise((resolve)=>{
    const combinations=buildCombinations(experiment.paramRanges);
    let completedCount=0;
    let activeWorkers=0;
    let comboIdx=0;

    console.log(`\n=== Starting experiment "${experiment.name}" — ${combinations.length} combinations (${MAX_WORKERS} parallel workers) ===`);

    function runNext(){
      while(activeWorkers<MAX_WORKERS&&comboIdx<combinations.length){
        const combo=combinations[comboIdx++];
        activeWorkers++;
        const worker=new Worker(path.join(__dirname,'worker.js'),{
          workerData:{combo,params:combo}
        });
        worker.on('message',async(msg)=>{
          completedCount++;
          activeWorkers--;

          const{error}=await supabase.from('experiments').insert({
            experiment_name:experiment.name,
            params:msg.combo,
            final_res:msg.result.finalRes,
            final_norm:msg.result.finalNorm,
            peak_res:msg.result.peakRes,
            peak_norm:msg.result.peakNorm
          });

          if(error){
            console.error(`Error saving combo ${JSON.stringify(msg.combo)}:`,error.message);
          } else {
            console.log(`[${experiment.name}] Done ${completedCount}/${combinations.length} — ${JSON.stringify(msg.combo)} → finalRes=${msg.result.finalRes} finalNorm=${msg.result.finalNorm} (saved)`);
          }

          if(completedCount===combinations.length){
            console.log(`=== Finished experiment "${experiment.name}" ===`);
            resolve();
          } else {
            runNext();
          }
        });
        worker.on('error',(err)=>console.error('Worker error:',err));
      }
    }
    runNext();
  });
}

async function runAllExperiments(){
  for(const experiment of EXPERIMENTS){
    await runExperiment(experiment);
  }
  console.log('\nAll experiments in the queue are complete.');
}

runAllExperiments();
