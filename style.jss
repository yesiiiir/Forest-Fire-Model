*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:monospace;background:#111;color:#eee;padding:10px;font-size:12px;}
#layout{display:grid;grid-template-columns:auto 1fr;gap:10px;}
canvas#c{display:block;border:1px solid #333;border-radius:4px;}
#right{display:flex;flex-direction:column;gap:6px;min-width:0;}
.chart-wrap{position:relative;height:110px;width:100%;}
.clabel{font-size:11px;color:#aaa;margin-bottom:2px;}
.legend{display:flex;flex-wrap:wrap;gap:5px 12px;font-size:11px;color:#aaa;}
.leg-dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:3px;vertical-align:middle;}
#controls{display:flex;align-items:center;gap:10px;margin-top:6px;font-size:12px;color:#aaa;flex-wrap:wrap;}
#controls input[type=range]{width:100px;vertical-align:middle;}
#livebar{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;}
.lstat{background:#1e1e1e;border-radius:4px;padding:3px 8px;font-size:11px;}
.lstat span{font-weight:bold;}
#statsPanel{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;}
.scard{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:7px 9px;}
.stitle{font-size:10px;color:#888;margin-bottom:5px;letter-spacing:.04em;text-transform:uppercase;}
.rows{display:flex;flex-direction:column;gap:3px;}
.row{display:flex;justify-content:space-between;font-size:11px;}
.row .k{color:#888;}.row .v{font-weight:bold;}
.norm-c{color:#e07840;}.res-c{color:#2acc80;}.fire-c{color:#ff5500;}.inf-c{color:#bb44ff;}
#expPanel{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:8px 10px;margin-top:6px;}
#expControls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
#expControls select,#expControls button{font-size:11px;background:#222;color:#eee;border:1px solid #444;border-radius:4px;padding:3px 7px;cursor:pointer;}
#expControls button:hover{background:#333;}
#expControls button.running{background:#2a4a2a;border-color:#2acc80;color:#2acc80;cursor:default;}
.chart-wrap-exp{position:relative;height:420px;width:100%;}
.ctrl-btn{background:#222;border:1px solid #555;color:#eee;font-size:11px;border-radius:4px;padding:3px 9px;cursor:pointer;}
.ctrl-btn:hover{background:#333;}
#infBtn.inf-on{background:#2a1a3a;border-color:#bb44ff;color:#bb44ff;}
#infBtn.inf-off{background:#222;border-color:#555;color:#aaa;}
#expProgress{font-size:11px;color:#aaa;min-height:16px;margin-bottom:3px;}
