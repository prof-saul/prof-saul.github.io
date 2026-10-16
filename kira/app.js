const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),NUM=/^-?\d+(\.\d+)?$/,
LB={ok:'✓ Día completo',part:'◐ Incompleto',none:'○ Sin iniciar'};
let D=[],ST=[],tab='res',U={stu:0,day:0,fil:'all',q:'',sort:'name'},fsz=18;
function fs(n){fsz=Math.min(26,Math.max(14,fsz+n*2));document.documentElement.style.setProperty('--fs',fsz+'px')}
function theme(){const r=document.documentElement,d=matchMedia('(prefers-color-scheme:dark)').matches,cur=r.dataset.theme||(d?'dark':'light');r.dataset.theme=cur=='dark'?'light':'dark'}
function showErr(m){const e=$('#err');e.textContent=m;e.hidden=!m}
/* ---------- carga ---------- */
const drop=$('#drop');
$('#file').onchange=e=>e.target.files[0]&&load(e.target.files[0]);
['dragover','dragenter'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>e.dataTransfer.files[0]&&load(e.dataTransfer.files[0]));
function load(f){const r=new FileReader();r.onload=e=>{try{init(e.target.result.replace(/^\ufeff/,''),f.name);showErr('')}catch(x){showErr(x.message)}};r.readAsText(f,'utf-8')}
function init(text,name){
 const rows=Papa.parse(text,{skipEmptyLines:true}).data;
 if(rows.length<2)throw Error('El archivo está vacío o no tiene estudiantes.');
 const h=rows[0].map(x=>x.trim()),ni=h.indexOf('Nombre');
 if(ni<0)throw Error('Este archivo no tiene la columna “Nombre”. Use el CSV Gradebook (Points) de Lenguaje.');
 const re=/^(\d+)\.(\d+)\.(\d+)\s+(.*?)\(puntos,\s*de\s*([\d.]+)\)\s*$/i,LS=[];
 h.forEach((x,i)=>{const m=x.match(re);if(m)LS.push({i,code:`${m[1]}.${m[2]}.${m[3]}`,day:+m[1],ova:+m[2],max:+m[5],topic:((m[4].match(/OVA\s*\d+\s*[,:]?\s*(.*)$/)||[])[1]||'').trim()})});
 if(!LS.length)throw Error('No encontré lecciones con el formato “1.1.1 Grado 4, Día 1, OVA 1 … (puntos, de N)”. Este visor solo funciona con el CSV Gradebook de Lenguaje. Columnas encontradas: '+h.slice(0,6).join(' | ').slice(0,300));
 const ti=h.findIndex(x=>x.startsWith('Total (puntos)')),pi=h.findIndex(x=>x.startsWith('Total posible')),ei=h.findIndex(x=>x.startsWith('Correo'));
 ST=rows.slice(1).filter(r=>(r[ni]||'').trim()).map(r=>{const c={};LS.forEach(l=>{const v=(r[l.i]||'').trim();c[l.i]=NUM.test(v)?{s:'H',v:+v}:v=='NC'?{s:'C'}:{s:'P'}});
  return{name:r[ni].trim(),mail:ei>=0?r[ei]:'',tot:ti>=0?r[ti]:'',pos:pi>=0?r[pi]:'',c}});
 const dm={};LS.forEach(l=>(dm[l.day]=dm[l.day]||{n:l.day,lessons:[],t:{}}).lessons.push(l));
 D=Object.values(dm).sort((a,b)=>a.n-b.n);
 D.forEach(d=>{d.lessons.forEach(l=>{if(l.topic&&!/^comprensi/i.test(l.topic))d.t[l.topic]=(d.t[l.topic]||0)+1});
  const k=Object.keys(d.t).sort((a,b)=>d.t[b]-d.t[a])[0]||'Comprensión';d.title=k.charAt(0).toUpperCase()+k.slice(1);
  d.act=ST.some(s=>d.lessons.some(l=>s.c[l.i].s!='P'))});
 $('#from').value=1;$('#to').value=D[D.length-1].n;$('#act').checked=true;U={stu:0,day:0,fil:'all',q:'',sort:'name'};
 $('#meta').textContent=`Archivo: ${name} · ${ST.length} estudiantes · ${LS.length} lecciones en ${D.length} días`;
 $('#start').hidden=true;$('#app').hidden=false;$('#again').hidden=false;show('res')}
function resetApp(){$('#file').value='';$('#app').hidden=true;$('#start').hidden=false;$('#again').hidden=true}
/* ---------- cálculos ---------- */
const vis=()=>{const f=+$('#from').value||1,t=+$('#to').value||9999;return D.filter(d=>d.n>=f&&d.n<=t&&(!$('#act').checked||d.act))};
function sd(s,d){let h=0,c=0,p=0;d.lessons.forEach(l=>{const x=s.c[l.i].s;x=='P'?p++:x=='C'?c++:h++});return{h,c,p,n:d.lessons.length}}
const sk=x=>x.p==0?'ok':x.h+x.c==0?'none':'part',badge=k=>`<span class="b ${k}">${LB[k]}</span>`,
miss=(s,d)=>d.lessons.filter(l=>s.c[l.i].s=='P'),
grp=ls=>{const g={};ls.forEach(l=>(g[l.ova]=g[l.ova]||[]).push(l));return g},
chip=(s,l)=>{const c=s.c[l.i];return c.s=='H'?`<span class="ch ok">${l.code} ✓ ${c.v}/${l.max}</span>`:c.s=='C'?`<span class="ch mus">${l.code} ◔ Por calificar</span>`:`<span class="ch bad">${l.code} ✗ Falta</span>`};
function tot(s,ds){const t={h:0,c:0,p:0,n:0,dc:0};ds.forEach(d=>{const x=sd(s,d);t.h+=x.h;t.c+=x.c;t.p+=x.p;t.n+=x.n;if(x.p==0)t.dc++});return t}
const seg=(k,o)=>`<div class="seg" data-k="${k}">${o.map(([v,t])=>`<button class="${U[k]==v?'on':''}" data-v="${v}">${t}</button>`).join('')}</div>`;
document.addEventListener('click',e=>{const b=e.target.closest('.seg button');if(b){const g=b.parentNode;U[g.dataset.k]=b.dataset.v;g.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x==b));upd()}
 const t=e.target.closest('#tabs button');if(t)show(t.dataset.t)});
['from','to','act'].forEach(i=>$('#'+i).addEventListener('input',()=>upd()));
window.onbeforeprint=()=>document.querySelectorAll('details').forEach(d=>d.open=true);
/* ---------- vistas ---------- */
function show(t){tab=t;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));
 const P=$('#panel');
 if(t=='res')P.innerHTML='<div id="out"></div>';
 if(t=='est'){P.innerHTML=`<div class="bar noprint"><input type="text" id="q" placeholder="🔍 Escriba parte del nombre…" oninput="fillSel()"><select id="sel" aria-label="Estudiante" onchange="U.stu=+this.value;upd()"></select></div><div class="bar noprint">${seg('fil',[['all','Todos los días'],['inc','Solo con pendientes'],['ok','Solo completos']])}</div><div id="out"></div>`;fillSel();return}
 if(t=='dia'){P.innerHTML=`<div class="bar noprint"><select id="dsel" aria-label="Día" onchange="U.day=+this.value;upd()"></select>${seg('fil',[['all','Todos'],['inc','Incompletos'],['ok','Completos']])}</div><div id="out"></div>`;fillDays()}
 if(t=='con')P.innerHTML=`<div class="bar noprint"><input type="text" id="q" placeholder="🔍 Buscar estudiante…" oninput="upd()">${seg('sort',[['name','Orden A-Z'],['most','Más faltantes primero']])}</div><div class="bar noprint"><button onclick="tg(true)">Abrir todos</button><button onclick="tg(false)">Cerrar todos</button><button onclick="csv()">⬇ Descargar CSV</button><button onclick="print()">🖨 Imprimir</button></div><div id="out"></div>`;
 upd()}
const tg=o=>document.querySelectorAll('#out details').forEach(d=>d.open=o);
function fillSel(){const q=norm($('#q').value),sel=$('#sel'),ok=ST.map((s,i)=>[s,i]).filter(([s])=>norm(s.name).includes(q));
 sel.innerHTML=ok.map(([s,i])=>`<option value="${i}">${esc(s.name)}</option>`).join('');
 U.stu=ok.length?(ok.some(([,i])=>i==U.stu)?U.stu:ok[0][1]):-1;if(ok.length)sel.value=U.stu;upd()}
function fillDays(){const ds=vis(),s=$('#dsel');s.innerHTML=ds.map(d=>`<option value="${d.n}">Día ${d.n} · ${esc(d.title)}</option>`).join('');
 if(!ds.some(d=>d.n==U.day))U.day=ds.length?ds[0].n:0;s.value=U.day}
function upd(){const ds=vis();$('#cnt').textContent=`Mostrando ${ds.length} de ${D.length} días`;
 if(tab=='dia'&&document.activeElement.type!='number')fillDays();
 ({res:uRes,est:uEst,dia:uDia,con:uCon})[tab](ds)}
function uRes(ds){let p=0,pc=0;const rows=ST.map(s=>{const t=tot(s,ds);p+=t.p;pc+=t.n?(t.h+t.c)/t.n:0;return[s,t]});
 $('#out').innerHTML=`<div class="stats"><div class="stat"><b>${ST.length}</b>estudiantes</div><div class="stat"><b>${ds.length}</b>días en revisión</div><div class="stat"><b>${p}</b>lecciones faltantes en total</div><div class="stat"><b>${Math.round(100*pc/ST.length)}%</b>avance promedio del grupo</div></div>
 <div class="sc"><table><tr><th>Estudiante</th><th>Avance</th><th>Hechas</th><th>Por calificar</th><th>Faltan</th><th>Días completos</th><th class="noprint"></th></tr>${rows.map(([s,t])=>{const pct=t.n?Math.round(100*(t.h+t.c)/t.n):0;
 return`<tr><td><b>${esc(s.name)}</b></td><td><div class="pb"><i style="width:${pct}%"></i></div>${pct}%</td><td>${t.h}</td><td>${t.c}</td><td><b>${t.p}</b></td><td>${t.dc} de ${ds.length}</td><td class="noprint"><button onclick="U.stu=${ST.indexOf(s)};show('est')">Ver</button></td></tr>`}).join('')}</table></div>`}
function uEst(ds){const o=$('#out');if(U.stu<0){o.innerHTML='<p class="card">No hay estudiantes con ese nombre.</p>';return}
 const s=ST[U.stu],t=tot(s,ds),it=ds.map(d=>({d,x:sd(s,d)})).filter(y=>U.fil=='all'||(U.fil=='inc'?y.x.p>0:y.x.p==0));
 o.innerHTML=`<div class="card"><b style="font-size:1.15rem">${esc(s.name)}</b><br><span class="mut">${esc(s.mail)}</span><p style="margin:8px 0 0">Faltan <b>${t.p}</b> lecciones · Días completos: <b>${t.dc} de ${ds.length}</b>${s.tot!==''?` · Puntos: <b>${s.tot}</b> de ${s.pos}`:' · Sin puntos registrados'}</p></div>`+
 (it.length?it.map(({d,x})=>{const k=sk(x),g=grp(d.lessons);return`<details class="${k}"><summary><b>Día ${d.n}</b><span>${esc(d.title)}</span>${badge(k)}<span class="mut">${x.h+x.c} de ${x.n} lecciones</span></summary><div class="body">${Object.keys(g).map(v=>`<div class="ova"><b>OVA ${v}:</b> ${g[v].map(l=>chip(s,l)).join('')}</div>`).join('')}</div></details>`}).join(''):'<p class="card">No hay días con ese filtro.</p>')}
function uDia(ds){const d=D.find(x=>x.n==U.day),o=$('#out');if(!d){o.innerHTML='<p class="card">No hay días en el rango elegido.</p>';return}
 const r=ST.map(s=>({s,x:sd(s,d)})),ok=r.filter(y=>y.x.p==0).length,f=r.filter(y=>U.fil=='all'||(U.fil=='inc'?y.x.p>0:y.x.p==0));
 o.innerHTML=`<div class="card"><b style="font-size:1.15rem">Día ${d.n} · ${esc(d.title)}</b><p style="margin:6px 0 0">${d.lessons.length} lecciones · Completaron el día: <b>${ok}</b> de ${ST.length} estudiantes</p></div>`+
 f.map(({s,x})=>{const k=sk(x),m=grp(miss(s,d));return`<details class="${k}"><summary><b>${esc(s.name)}</b>${badge(k)}<span class="mut">${x.h+x.c} de ${x.n}</span></summary><div class="body">${x.p?Object.keys(m).map(v=>`<div class="ova"><b>OVA ${v} falta:</b> ${m[v].map(l=>`<span class="ch bad">${l.code}</span>`).join('')}</div>`).join(''):'<p>Todas las lecciones de este día están entregadas.</p>'}</div></details>`}).join('')}
function conList(){const q=norm(($('#q')||{value:''}).value),ds=vis();
 const l=ST.filter(s=>norm(s.name).includes(q)).map(s=>({s,days:ds.map(d=>({d,x:sd(s,d)})).filter(y=>y.x.p>0)})).filter(o=>o.days.length).map(o=>({...o,p:o.days.reduce((a,y)=>a+y.x.p,0)}));
 return U.sort=='most'?l.sort((a,b)=>b.p-a.p):l}
function uCon(){const l=conList(),sum=l.reduce((a,o)=>a+o.p,0);
 $('#out').innerHTML=`<div class="card"><b style="font-size:1.15rem">Consolidado general de lecciones faltantes</b><p style="margin:6px 0 0">${l.length} estudiantes con pendientes · <b>${sum}</b> lecciones faltantes en total</p></div>`+
 (l.length?l.map(o=>`<details><summary><b>${esc(o.s.name)}</b><span class="b none">${o.p} lecciones faltantes</span><span class="mut">en ${o.days.length} días</span></summary><div class="body">${o.days.map(({d,x})=>{const g=grp(miss(o.s,d));
 return`<div class="drow"><b>Día ${d.n}</b> · ${esc(d.title)} <span class="b ${sk(x)}">faltan ${x.p} de ${x.n}</span><div class="codes">${Object.keys(g).map(v=>`<span class="og"><b>OVA ${v}:</b> ${g[v].map(z=>z.code).join(', ')}</span>`).join('')}</div></div>`}).join('')}</div></details>`).join(''):'<p class="card">🎉 No hay lecciones faltantes con estos filtros.</p>')}
function csv(){const rows=[['Estudiante','Correo','Lecciones faltantes','Detalle por día']];
 conList().forEach(o=>rows.push([o.s.name,o.s.mail,o.p,o.days.map(y=>`Día ${y.d.n}: ${miss(o.s,y.d).map(l=>l.code).join(', ')}`).join(' | ')]));
 const t='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n'),a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='consolidado_lecciones_faltantes.csv';a.click()}
