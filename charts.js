const baseChartOpts={responsive:true,maintainAspectRatio:false,animation:false,
  plugins:{legend:{display:false}},
  elements:{point:{radius:0},line:{borderWidth:1.5}},
  scales:{x:{display:false},y:{min:0,ticks:{color:'#888',font:{size:10},maxTicksLimit:4},grid:{color:'rgba(255,255,255,0.06)'}}}};

const treeChart=new Chart(document.getElementById('treeChart'),{type:'line',data:{labels:[],datasets:[
  {label:'Softwood', data:[],borderColor:'#aadd55',backgroundColor:'rgba(170,221,85,0.12)',fill:true},
  {label:'Pioneer',  data:[],borderColor:'#66bb44',backgroundColor:'rgba(102,187,68,0.12)',fill:true},
  {label:'Hardwood', data:[],borderColor:'#8B5E3C',backgroundColor:'rgba(139,94,60,0.12)',fill:true},
  {label:'Redwood',  data:[],borderColor:'#8B3A3A',backgroundColor:'rgba(139,58,58,0.12)',fill:true},
  {label:'Sapling',  data:[],borderColor:'#4a7a3a',backgroundColor:'rgba(74,122,58,0.07)',fill:true},
]},options:{...baseChartOpts,plugins:{legend:{display:true,labels:{color:'#aaa',font:{size:10},boxWidth:10,padding:6}}}}});

const fireChart=new Chart(document.getElementById('fireChart'),{type:'line',data:{labels:[],datasets:[
  {label:'Fire',   data:[],borderColor:'#ff5500',backgroundColor:'rgba(255,85,0,0.18)',fill:true},
  {label:'Infected',data:[],borderColor:'#bb44ff',backgroundColor:'rgba(187,68,255,0.12)',fill:true},
  {label:'Choppers',data:[],borderColor:'#ffdd00',backgroundColor:'transparent',fill:false},
  {label:'Planters',data:[],borderColor:'#44aaff',backgroundColor:'transparent',fill:false},
]},options:baseChartOpts});

const humanChart=new Chart(document.getElementById('humanChart'),{type:'line',data:{labels:[],datasets:[
  {label:'Choppers',data:[],borderColor:'#ffdd00',backgroundColor:'rgba(255,221,0,0.12)',fill:true},
  {label:'Planters',data:[],borderColor:'#44aaff',backgroundColor:'rgba(68,170,255,0.12)',fill:true},
]},options:baseChartOpts});

let chartTick=0;
function updateCharts(){
  const len=softHist.length,labels=Array.from({length:len},(_,i)=>i);
  treeChart.data.labels=labels;
  treeChart.data.datasets[0].data=[...softHist];
  treeChart.data.datasets[1].data=[...pionHist];
  treeChart.data.datasets[2].data=[...hardHist];
  treeChart.data.datasets[3].data=[...resistHist];
  treeChart.data.datasets[4].data=[...sapHist];
  treeChart.update('none');
  fireChart.data.labels=labels;
  fireChart.data.datasets[0].data=[...fireHist];
  fireChart.data.datasets[1].data=[...infHist];
  fireChart.data.datasets[2].data=[];
  fireChart.data.datasets[3].data=[];
  fireChart.update('none');
  humanChart.data.labels=labels;
  humanChart.data.datasets[0].data=TOGGLES.humans?[...chopperHist]:[];
  humanChart.data.datasets[1].data=TOGGLES.humans?[...planterHist]:[];
  humanChart.update('none');
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
