const baseChartOpts={responsive:true,maintainAspectRatio:false,animation:false,
  plugins:{legend:{display:false}},
  elements:{point:{radius:0},line:{borderWidth:1.5}},
  scales:{x:{display:false},y:{min:0,ticks:{color:'#888',font:{size:10},maxTicksLimit:4},grid:{color:'rgba(255,255,255,0.06)'}}}};

const treeChart=new Chart(document.getElementById('treeChart'),{type:'line',data:{labels:[],datasets:[
  {label:'Normal',data:[],borderColor:'#e07840',backgroundColor:'rgba(224,120,64,0.15)',fill:true},
  {label:'Resistant',data:[],borderColor:'#2acc80',backgroundColor:'rgba(42,204,128,0.12)',fill:true},
  {label:'Sapling',data:[],borderColor:'#7aaa40',backgroundColor:'rgba(122,170,64,0.07)',fill:true},
]},options:baseChartOpts});

const fireChart=new Chart(document.getElementById('fireChart'),{type:'line',data:{labels:[],datasets:[
  {label:'Fire',data:[],borderColor:'#ff5500',backgroundColor:'rgba(255,85,0,0.18)',fill:true},
  {label:'Infected',data:[],borderColor:'#bb44ff',backgroundColor:'rgba(187,68,255,0.12)',fill:true},
]},options:baseChartOpts});

let chartTick=0;
function updateCharts(){
  const len=normHist.length,labels=Array.from({length:len},(_,i)=>i);
  treeChart.data.labels=labels;
  treeChart.data.datasets[0].data=[...normHist];
  treeChart.data.datasets[1].data=[...resHist];
  treeChart.data.datasets[2].data=[...sapHist];
  treeChart.update('none');
  fireChart.data.labels=labels;
  fireChart.data.datasets[0].data=[...fireHist];
  fireChart.data.datasets[1].data=[...infHist];
  fireChart.update('none');
}

const EXP_Y_TICKS=[0,250,500,750,1000,3000,5000,7000,9000];

function makeExpXScale(sampleEvery){
  const TICKS_PER_YEAR=buildSeasons().reduce((a,s)=>a+s.ticks,0);
  return{display:true,ticks:{color:'#888',font:{size:9},maxTicksLimit:10,
    callback:(v)=>{const yr=Math.round(v*sampleEvery/TICKS_PER_YEAR);return yr+'yr';}},
    grid:{color:'rgba(255,255,255,0.04)'}};
}

function makeExpYScale(){
  return{type:'linear',min:0,max:9000,
    afterBuildTicks:(axis)=>{axis.ticks=EXP_Y_TICKS.map(v=>({value:v}));},
    ticks:{color:'#888',font:{size:10},padding:4,callback:(v)=>v>=1000?(v/1000).toFixed(0)+'k':v},
    grid:{color:(ctx)=>ctx.tick.value===1000?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.06)'}};
}

function makeExpChartOpts(){
  return{responsive:true,maintainAspectRatio:false,animation:false,
    layout:{padding:{top:12,right:8,bottom:4,left:4}},
    plugins:{legend:{display:true,labels:{color:'#aaa',font:{size:10},boxWidth:10,padding:8}}},
    elements:{point:{radius:0},line:{borderWidth:1.5}},
    scales:{x:makeExpXScale(EXP_SAMPLE_EVERY),y:makeExpYScale()}};
}

function updateExpChart(){}

const sweepChart=new Chart(document.getElementById('sweepChart'),{type:'line',
  data:{labels:Array.from({length:500},(_,i)=>i),datasets:[]},options:makeExpChartOpts()});
const sweepChartNorm=new Chart(document.getElementById('sweepChartNorm'),{type:'line',
  data:{labels:Array.from({length:500},(_,i)=>i),datasets:[]},options:makeExpChartOpts()});

function updateSweepChart(){
  sweepChart.data.datasets=sweepResults.map(r=>({label:r.label,data:r.dataRes,borderColor:r.color,backgroundColor:'transparent',fill:false}));
  sweepChart.update('none');
  sweepChartNorm.data.datasets=sweepResults.map(r=>({label:r.label,data:r.dataNorm,borderColor:r.color,backgroundColor:'transparent',fill:false}));
  sweepChartNorm.update('none');
}
