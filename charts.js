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
const expChartXScale={display:true,ticks:{color:'#888',font:{size:9},maxTicksLimit:10,
  callback:(v)=>{const yr=Math.round(v*EXP_SAMPLE_EVERY/TICKS_PER_YEAR);return yr+'yr';}},
  grid:{color:'rgba(255,255,255,0.04)'}};

function makeExpYScale(){
  return{
    type:'linear',min:0,max:9000,
    afterBuildTicks:(axis)=>{axis.ticks=EXP_Y_TICKS.map(v=>({value:v}));},
    ticks:{color:'#888',font:{size:10},padding:4,callback:(v)=>v>=1000?(v/1000).toFixed(0)+'k':v},
    grid:{color:(ctx)=>ctx.tick.value===1000?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.06)'}
  };
}

function makeExpChartOpts(){
  return{responsive:true,maintainAspectRatio:false,animation:false,
    layout:{padding:{top:12,right:8,bottom:4,left:4}},
    plugins:{legend:{display:true,labels:{color:'#aaa',font:{size:10},boxWidth:10,padding:8}}},
    elements:{point:{radius:0},line:{borderWidth:1.5}},
    scales:{x:expChartXScale,y:makeExpYScale()}};
}

const expChart=new Chart(document.getElementById('expChart'),{
  type:'line',
  data:{labels:Array.from({length:EXP_SAMPLES},(_,i)=>i),datasets:[]},
  options:makeExpChartOpts()
});

const expChartNorm=new Chart(document.getElementById('expChartNorm'),{
  type:'line',
  data:{labels:Array.from({length:EXP_SAMPLES},(_,i)=>i),datasets:[]},
  options:makeExpChartOpts()
});

function updateExpChart(){
  expChart.data.datasets=expResults.map(r=>({
    label:r.label,data:r.dataRes,borderColor:'#2acc80',backgroundColor:'rgba(42,204,128,0.1)',fill:false
  }));
  expChart.update('none');
  expChartNorm.data.datasets=expResults.map(r=>({
    label:r.label,data:r.dataNorm,borderColor:'#e07840',backgroundColor:'rgba(224,120,64,0.1)',fill:false
  }));
  expChartNorm.update('none');
}
