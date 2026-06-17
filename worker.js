const{workerData,parentPort}=require('worker_threads');
const{runSim}=require('./sim-core.js');
const result=runSim(workerData.params);
parentPort.postMessage({combo:workerData.combo,result});
