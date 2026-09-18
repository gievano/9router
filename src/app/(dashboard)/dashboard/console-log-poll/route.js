export const GET = () => new Response(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Console Log - 9Router</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0b;color:#d4d4d8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:16px}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.header h1{font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px}
.badge{padding:2px 8px;border-radius:4px;font-size:10px}
.connected{background:rgba(34,197,94,.1);color:#22c55e}
.disconnected{background:rgba(239,68,68,.1);color:#ef4444}
.console{background:#000;border-radius:6px;padding:12px;height:calc(100vh-80px);overflow-y:auto;line-height:1.6}
.num{color:#52525b;min-width:40px;text-align:right;user-select:none}
.empty{color:#52525b;font-style:italic}
.green{color:#22c55e}.blue{color:#3b82f6}.yellow{color:#eab308}.red{color:#ef4444}.purple{color:#a855f7}
.btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#d4d4d8;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px}
.btn:hover{background:rgba(255,255,255,.1)}
</style>
</head>
<body>
<div class="header">
<h1>&#x1f4c4; Console Logs <span class="badge" id="status">Connecting...</span> <span style="font-size:11px;color:#52525b" id="count"></span></h1>
<button class="btn" onclick="clearLogs()">&#x1f5d1; Clear</button>
</div>
<div class="console" id="log"><span class="empty">Loading...</span></div>
<script>
let seen=0,connected=false;
function cl(l){if(l.includes('[ERROR]')||l.includes('✗'))return'red';if(l.includes('[WARN]'))return'yellow';if(l.includes('▶'))return'blue';if(l.includes('✓')||l.includes('DONE'))return'green';if(l.includes('[DEBUG]'))return'purple';return''}
async function poll(){
try{
const r=await fetch('/api/translator/console-logs');
if(!r.ok){document.getElementById('status').textContent='Auth required';document.getElementById('status').className='badge disconnected';return}
const d=await r.json();
if(!d.success)return;
if(!connected){connected=true;document.getElementById('status').textContent='Connected';document.getElementById('status').className='badge connected'}
if(d.logs.length===seen)return;
const el=document.getElementById('log');
if(seen===0)el.innerHTML='';
for(let i=seen;i<d.logs.length;i++){const c=cl(d.logs[i]);el.innerHTML+='<div style="display:flex;gap:8px"><span class="num">'+(i+1)+'</span><span class="'+c+'">'+d.logs[i]+'</span></div>'}
seen=d.logs.length;
document.getElementById('count').textContent='('+seen+' lines)';
el.scrollTop=el.scrollHeight;
}catch(e){connected=false;document.getElementById('status').textContent='Disconnected';document.getElementById('status').className='badge disconnected'}
}
async function clearLogs(){try{await fetch('/api/translator/console-logs',{method:'DELETE'});seen=0;document.getElementById('log').innerHTML='<span class="empty">No console logs yet.</span>';document.getElementById('count').textContent='(0 lines)'}catch(e){}}
poll();setInterval(poll,2000);
</script>
</body>
</html>`, {headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"}});