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
    name:'infSpread_vs_infDeathMin_new',
    paramRanges:{
      infSpread:[0.1,0.2,0.32,0.5,0.7],
      infDeathMin:[10,25,35,60,100]
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
            peak_norm:msg.result.peakNorm,
            time_series_res:msg.result.avgRes,
            time_series_norm:msg.result.avgNorm,
            q1_res:msg.result.q1Res,
            q3_res:msg.result.q3Res,
            q1_norm:msg.result.q1Norm,
            q3_norm:msg.result.q3Norm,
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
