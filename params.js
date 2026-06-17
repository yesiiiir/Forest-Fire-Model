const PARAMS = {
  
    fireSpreadNorm:    0.42,
    fireSpreadRes:     0.07,
    fireSpreadSapling: 0.55,
    fireEmberSpread:   0.08,
    fireResEmberChance:0.12,
  
    
    infSpread:         0.32,
    infNbrsMult:       0.28,
    infSpont:          0.00018,
    infDeathMin:       35,
    infDeathRand:      35,
  
    
    growMultiplier:      1.0,
    growRateSpontaneous: 0.03,
    growRateNeighbor:    0.06,
    saplingMatureAge:    180,
    saplingMatureRand:   80,
  
    
    springTicks:  500,
    summerTicks:  500,
    autumnTicks:  500,
    winterTicks:  500,
  
    
    springGrowRate:   0.001,
    springFireChance: 0.0003,
    springRainChance: 0.0,
    springSpread:     0.18,
  
    summerGrowRate:   0.001,
    summerFireChance: 0.0018,
    summerRainChance: 0.0,
    summerSpread:     0.82,
  
    autumnGrowRate:   0.001,
    autumnFireChance: 0.0002,
    autumnRainChance: 0.002,
    autumnSpread:     0.10,
  
    winterGrowRate:   0.001,
    winterFireChance: 0.00005,
    winterRainChance: 0.003,
    winterSpread:     0.0,
  };
  
  const TOGGLES = {
    infection:      false,
    seasons:        true,
    fire:           true,
    nbrSpread:      true,
    spontInfection: true,
    rain:           true,
  };
  
  function resetParams(){
    PARAMS.fireSpreadNorm    = 0.42;
    PARAMS.fireSpreadRes     = 0.07;
    PARAMS.fireSpreadSapling = 0.55;
    PARAMS.fireEmberSpread   = 0.08;
    PARAMS.fireResEmberChance= 0.12;
    PARAMS.infSpread         = 0.32;
    PARAMS.infNbrsMult       = 0.28;
    PARAMS.infSpont          = 0.00018;
    PARAMS.infDeathMin       = 35;
    PARAMS.infDeathRand      = 35;
    PARAMS.growMultiplier    = 1.0;
    PARAMS.growRateSpontaneous=0.03;
    PARAMS.growRateNeighbor  = 0.06;
    PARAMS.saplingMatureAge  = 180;
    PARAMS.saplingMatureRand = 80;
    PARAMS.springTicks=500;PARAMS.summerTicks=500;PARAMS.autumnTicks=500;PARAMS.winterTicks=500;
    PARAMS.springGrowRate=0.001;PARAMS.springFireChance=0.0003;PARAMS.springRainChance=0.0;PARAMS.springSpread=0.18;
    PARAMS.summerGrowRate=0.001;PARAMS.summerFireChance=0.0018;PARAMS.summerRainChance=0.0;PARAMS.summerSpread=0.82;
    PARAMS.autumnGrowRate=0.001;PARAMS.autumnFireChance=0.0002;PARAMS.autumnRainChance=0.002;PARAMS.autumnSpread=0.10;
    PARAMS.winterGrowRate=0.001;PARAMS.winterFireChance=0.00005;PARAMS.winterRainChance=0.003;PARAMS.winterSpread=0.0;
    TOGGLES.infection=false;TOGGLES.seasons=true;TOGGLES.fire=true;
    TOGGLES.nbrSpread=true;TOGGLES.spontInfection=true;TOGGLES.rain=true;
  }
  
  function buildSeasons(){
    return[
      {name:'Spring',ticks:PARAMS.springTicks,growRate:PARAMS.springGrowRate,fireChance:PARAMS.springFireChance,rainChance:TOGGLES.rain?PARAMS.springRainChance:0,spread:PARAMS.springSpread},
      {name:'Summer',ticks:PARAMS.summerTicks,growRate:PARAMS.summerGrowRate,fireChance:PARAMS.summerFireChance,rainChance:TOGGLES.rain?PARAMS.summerRainChance:0,spread:PARAMS.summerSpread},
      {name:'Autumn',ticks:PARAMS.autumnTicks,growRate:PARAMS.autumnGrowRate,fireChance:PARAMS.autumnFireChance,rainChance:TOGGLES.rain?PARAMS.autumnRainChance:0,spread:PARAMS.autumnSpread},
      {name:'Winter',ticks:PARAMS.winterTicks,growRate:PARAMS.winterGrowRate,fireChance:PARAMS.winterFireChance,rainChance:TOGGLES.rain?PARAMS.winterRainChance:0,spread:PARAMS.winterSpread},
    ];
  }
  
  const PARAMETERS = [
    {key:'fireSpreadNorm',    label:'Fire spread (normal)',      min:0.05, max:0.97, step:0.1},
    {key:'fireSpreadRes',     label:'Fire spread (resistant)',   min:0.01, max:0.5,  step:0.05},
    {key:'infSpread',         label:'Infection spread',          min:0.05, max:0.9,  step:0.1},
    {key:'infSpont',          label:'Infection spontaneous',     min:0.00005,max:0.001,step:0.0001},
    {key:'infDeathMin',       label:'Infection death speed',     min:10,   max:100,  step:10},
    {key:'growMultiplier',    label:'Tree growth rate',          min:0.25, max:3.0,  step:0.25},
  ];
