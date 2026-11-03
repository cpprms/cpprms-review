/* 승하차 데이터 관리 화면 스크립트
   개선안 데모 v2.0 의 화면 로직을 그대로 쓰고, 자료(사업자, 등록 자료, 역별 월별 수치)만 서버에서 받는다.
   서버 주소: /rideMng/init.json, dataList.json, stat.json, dataAdd.json, dataDelete.json, fileDown.do */

const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toT; function tst(m){const e=$('toast');e.textContent=m;e.classList.add('on');clearTimeout(toT);toT=setTimeout(()=>e.classList.remove('on'),1800);}

async function getJSON(url){ const r=await fetch(CTX+url,{headers:{'Accept':'application/json'}}); if(!r.ok) throw new Error(r.status); return r.json(); }
async function postForm(url,body){ const r=await fetch(CTX+url,{method:'POST',body}); if(!r.ok) throw new Error(r.status); return r.json(); }

/* ===== 서버 자료 ===== */
let ORGS=[];            /* [{orgId, orgNm, lineNm}] */
let YEARS=[];           /* 등록 자료가 있는 연도 (내림차순) */
let POSTS=[];           /* 등록 자료 목록 */
const STAT={};          /* 사업자별 통계 자료 캐시 */
const BASIS='운영사 제출 자료';
const orgNm=id=>{const o=ORGS.find(x=>x.orgId===id); return o?o.orgNm:id;};
const orgLine=id=>{const o=ORGS.find(x=>x.orgId===id); return o?o.lineNm:'-';};

async function loadPosts(){
  const list=await getJSON('/rideMng/dataList.json');
  POSTS=list.map(d=>({id:d.dataId,orgId:d.orgId,org:d.orgNm,year:d.yr,ms:d.ms,me:d.me,by:d.regUser,reg:d.regDt,mod:d.modDt,hasFile:d.hasFile,fileNm:d.fileNm}));
}
async function loadStat(orgId,force){
  if(STAT[orgId]&&!force) return STAT[orgId];
  const d=await getJSON('/rideMng/stat.json?orgId='+encodeURIComponent(orgId));
  const VAL={}; d.months.forEach(r=>{ VAL[r.stnId+'|'+r.yr+'|'+r.mon]=[r.upCnt,r.dnCnt]; });
  STAT[orgId]={posts:d.posts, ST:d.stations.map(s=>({id:s.stnId,nm:s.stnNm})), VAL};
  return STAT[orgId];
}
function clearStat(){ Object.keys(STAT).forEach(k=>delete STAT[k]); }

/* 현재 통계 대상(Q.org)의 자료 */
let ST=[];
const cur=()=>STAT[Q.org]||{posts:[],ST:[],VAL:{}};
const postOf=(y,orgId)=>{ const s=STAT[orgId||Q.org]; return s?s.posts.find(p=>p.yr===y):null; };
const lastMonth=y=>{ const p=postOf(y); return p?p.me:0; };
/* 월 실적: 등록 자료의 데이터 기간 안이고 수치가 있으면 값, 아니면 null(미집계) */
function mVal(s,y,m,si,orgId){
  const st=STAT[orgId||Q.org]; if(!st) return null;
  const p=st.posts.find(x=>x.yr===y); if(!p||m<p.ms||m>p.me) return null;
  const v=st.VAL[s.id+'|'+y+'|'+m]; return v?v[si]:null;
}

/* ===== 자료 관리 탭 ===== */
const F={org:"",year:"",kw:""}; let PAGE=1; const PER=10;
const titleOf=p=>p.org+" "+p.year+"년 역별 승하차 실적";
const periodOf=p=>p.ms+"~"+p.me+"월";

function opts(id,list,first){ $(id).innerHTML=(first?'<option value="">'+first+'</option>':'')+list.map(v=>'<option value="'+esc(v.v)+'">'+esc(v.t)+'</option>').join(''); }
function calcYears(){
  const ys=[...new Set(POSTS.map(p=>p.year))].sort((a,b)=>b-a);
  YEARS=ys.length?ys:[new Date().getFullYear()-1];
}
function initSel(){
  opts('fOrg',ORGS.map(o=>({v:o.orgId,t:o.orgNm})),'전체');
  opts('fYear',YEARS.map(y=>({v:y,t:y+'년'})),'전체');
  opts('aOrg',ORGS.map(o=>({v:o.orgId,t:o.orgNm})));
  const thisYear=new Date().getFullYear();
  opts('aYear',[...new Set([thisYear,...YEARS])].sort((a,b)=>b-a).map(y=>({v:y,t:y+'년'})));
  const ms=Array.from({length:12},(_,i)=>({v:i+1,t:(i+1)+'월'}));
  opts('aMs',ms); opts('aMe',ms);
}

const orgIdx=id=>ORGS.findIndex(o=>o.orgId===id);
function filtered(){
  return POSTS.filter(p=>(!F.org||p.orgId===F.org)&&(!F.year||p.year===+F.year)&&(!F.kw||titleOf(p).includes(F.kw)))
    .sort((a,b)=>b.year-a.year||orgIdx(a.orgId)-orgIdx(b.orgId));
}
function search(){ F.org=$('fOrg').value; F.year=$('fYear').value; F.kw=$('fKw').value.trim(); PAGE=1; render(); }
function resetFilter(){ $('fOrg').value='';$('fYear').value='';$('fKw').value=''; search(); }

function renderMx(){
  const ys=[...new Set([...YEARS,...POSTS.map(p=>p.year)])].sort((a,b)=>b-a);
  let h='<tr><th style="width:180px">사업자</th>'+ys.map(y=>'<th>'+y+'년</th>').join('')+'<th style="width:110px">등록 연도 수</th></tr>';
  let reg=0;
  ORGS.forEach(o=>{ let n=0;
    h+='<tr><td class="org">'+esc(o.orgNm)+'</td>'+ys.map(y=>{ const p=POSTS.find(x=>x.orgId===o.orgId&&x.year===y);
      if(p){ n++; return '<td class="cell" onclick="openDetail('+p.id+')"><span class="reg">등록 <small>'+periodOf(p)+' / '+esc(p.reg)+'</small></span></td>'; }
      return '<td class="cell" onclick="openAdd(\''+esc(o.orgId)+'\','+y+')"><span class="no">미등록</span></td>'; }).join('')
      +'<td class="cnt">'+n+' / '+ys.length+'</td></tr>'; reg+=n; });
  $('mx').innerHTML=h;
  $('mxSum').textContent='등록 '+reg+'건 / 전체 '+(ORGS.length*ys.length)+'칸 ('+ORGS.length+'개 사업자, '+ys.length+'개 연도)';
}
function renderList(){
  const rows=filtered(); $('cnt').textContent=rows.length;
  const pages=Math.max(1,Math.ceil(rows.length/PER)); if(PAGE>pages) PAGE=pages;
  const view=rows.slice((PAGE-1)*PER,PAGE*PER);
  $('lstBody').innerHTML = view.length ? view.map(p=>'<tr><td><input type="checkbox" class="chk" value="'+p.id+'" aria-label="선택"></td><td>'+esc(p.org)+'</td><td>'+p.year+'</td>'
    +'<td class="tt"><a href="#" onclick="openDetail('+p.id+');return false">'+esc(titleOf(p))+'</a></td>'
    +'<td><span class="tag '+(p.ms===1&&p.me===12?'full':'part')+'">'+periodOf(p)+'</span></td><td>'+esc(p.by)+'</td><td class="num">'+esc(p.reg)+'</td><td class="num">'+esc(p.mod)+'</td></tr>').join('')
    : '<tr class="empty"><td colspan="8">조회 조건에 맞는 자료 없음</td></tr>';
  $('pager').innerHTML=Array.from({length:pages},(_,i)=>'<button class="'+(i+1===PAGE?'on':'')+'" onclick="PAGE='+(i+1)+';renderList()">'+(i+1)+'</button>').join('');
  $('chkAll').checked=false;
}
function render(){ renderMx(); renderList(); }

function toggleAll(c){ document.querySelectorAll('.chk').forEach(x=>x.checked=c.checked); }
async function delSel(){
  const ids=[...document.querySelectorAll('.chk:checked')].map(x=>+x.value);
  if(!ids.length){ tst('삭제할 자료 선택 필요'); return; }
  if(!confirm(ids.length+'건을 삭제합니다. 승하차 통계와 레포트에서도 해당 자료가 빠짐')) return;
  const fd=new URLSearchParams(); ids.forEach(i=>fd.append('dataIds',i));
  try{
    const r=await postForm('/rideMng/dataDelete.json',fd);
    await reloadAll(); tst(r.cnt+'건 삭제');
  }catch(e){ tst('삭제 중 오류 발생, 다시 시도 필요'); }
}
async function reloadAll(){ await loadPosts(); calcYears(); clearStat(); render(); await loadStat(Q.org); renderStat(); }

function closeM(id){ $(id).classList.remove('on'); }
async function openDetail(id){
  const p=POSTS.find(x=>x.id===id); if(!p) return;
  let st; try{ st=await loadStat(p.orgId); }catch(e){ tst('자료 조회 중 오류 발생'); return; }
  $('dTitle').textContent=titleOf(p);
  const fileTd=p.hasFile?'<a href="'+CTX+'/rideMng/fileDown.do?dataId='+p.id+'">'+esc(p.fileNm)+'</a>':'없음 (예시 자료)';
  $('dMeta').innerHTML='<tr><th>사업자</th><td>'+esc(p.org)+'</td><th>연도</th><td>'+p.year+'년</td><th>데이터 기간</th><td>'+periodOf(p)+'</td></tr>'
    +'<tr><th>등록자</th><td>'+esc(p.by)+'</td><th>등록일</th><td>'+esc(p.reg)+'</td><th>수정일</th><td>'+esc(p.mod)+'</td></tr>'
    +'<tr><th>자료 출처</th><td colspan="3">'+BASIS+'</td><th>첨부 파일</th><td>'+fileTd+'</td></tr>';
  const hasVal=st.ST.some(s=>st.VAL[s.id+'|'+p.year+'|'+p.ms]);
  if(!st.ST.length||!hasVal){ $('dBody').innerHTML='<div class="nodata">예시 수치는 경기철도만 구성 (다른 사업자도 같은 표 형식)</div>'; }
  else {
    const ms=[]; for(let m=p.ms;m<=p.me;m++) ms.push(m);
    const val=(s,m,si)=>mVal(s,p.year,m,si,p.orgId)||0;
    let h='<table class="dt"><thead><tr><th class="fx" rowspan="2">역명</th><th colspan="2">합계('+periodOf(p)+')</th>'+ms.map(m=>'<th colspan="2">'+m+'월</th>').join('')+'</tr><tr>'
      +['합계',...ms].map(()=>'<th>승차</th><th>하차</th>').join('')+'</tr></thead><tbody>';
    const tot=[0,0], mt=ms.map(()=>[0,0]); let body='';
    st.ST.forEach(s=>{ const v=ms.map(m=>[val(s,m,0),val(s,m,1)]); const t=[0,1].map(i=>v.reduce((a,x)=>a+x[i],0));
      v.forEach((x,i)=>{mt[i][0]+=x[0];mt[i][1]+=x[1];}); tot[0]+=t[0]; tot[1]+=t[1];
      body+='<tr><td class="fx">'+esc(s.nm)+'</td><td class="num">'+t[0].toLocaleString()+'</td><td class="num">'+t[1].toLocaleString()+'</td>'+v.map(x=>'<td class="num">'+x[0].toLocaleString()+'</td><td class="num">'+x[1].toLocaleString()+'</td>').join('')+'</tr>'; });
    h+='<tr class="tot"><td class="fx">합계</td><td class="num">'+tot[0].toLocaleString()+'</td><td class="num">'+tot[1].toLocaleString()+'</td>'+mt.map(x=>'<td class="num">'+x[0].toLocaleString()+'</td><td class="num">'+x[1].toLocaleString()+'</td>').join('')+'</tr>'+body+'</tbody></table>';
    $('dBody').innerHTML=h;
  }
  $('mDetail').classList.add('on');
}

function openAdd(orgId,year){
  $('aOrg').value=orgId||ORGS[0].orgId; $('aYear').value=year||new Date().getFullYear(); $('aMs').value=1; $('aMe').value=12;
  $('aFile').value='';
  checkAdd(); $('mAdd').classList.add('on');
}
/* 등록 전 검사: 같은 사업자, 연도 중복 및 기간 역순 차단 (서버에서도 같은 검사) */
const ALLOW_EXT=['xlsx','xls','csv','pdf','hwp'];
function checkAdd(){
  const o=$('aOrg').value, y=+$('aYear').value, s=+$('aMs').value, e=+$('aMe').value, msg=$('aMsg');
  $('aTitle').textContent=orgNm(o)+' '+y+'년 역별 승하차 실적';
  let err='';
  const f=$('aFile').files[0], ext=f?(f.name.split('.').pop()||'').toLowerCase():'';
  if(POSTS.some(p=>p.orgId===o&&p.year===y)) err='같은 사업자, 연도의 자료가 이미 등록됨, 기존 자료 수정 필요';
  else if(e<s) err='종료월이 시작월보다 앞섬, 데이터 기간 재선택 필요';
  else if(f&&!ALLOW_EXT.includes(ext)) err='첨부할 수 없는 파일 형식(xlsx, xls, csv, pdf, hwp만 가능)';
  msg.className='fmsg'+(err?' err':'');
  msg.textContent=err||(f?'':'자료 파일 첨부 필요'); msg.style.display=msg.textContent?'':'none';
  $('aSave').disabled=!!err||!f;
}
async function saveAdd(){
  const fd=new FormData();
  fd.append('orgId',$('aOrg').value); fd.append('yr',$('aYear').value); fd.append('ms',$('aMs').value); fd.append('me',$('aMe').value);
  fd.append('file',$('aFile').files[0]);
  $('aSave').disabled=true;
  try{
    const r=await postForm('/rideMng/dataAdd.json',fd);
    if(!r.ok){ const m=$('aMsg'); m.className='fmsg err'; m.textContent=r.msg; m.style.display=''; return; }
    closeM('mAdd'); await reloadAll(); tst(r.data.orgNm+' '+r.data.yr+'년 역별 승하차 실적 등록');
  }catch(e){ const m=$('aMsg'); m.className='fmsg err'; m.textContent='등록 중 오류 발생, 다시 시도 필요'; m.style.display=''; }
  finally{ checkAdd(); }
}
/* 운영사 제출 양식(.xlsx): 역명, 월, 승차, 하차 열 고정 */
function downloadTemplate(){
  if(!window.XLSX){ tst('엑셀 라이브러리 미로딩'); return; }
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([["역명","월","승차","하차"]]),'제출양식');
  XLSX.writeFile(wb,'승하차실적_운영사제출양식.xlsx'); tst('제출 양식(.xlsx) 내려받기');
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeM('mDetail');closeM('mAdd');} });

/* ===== 승하차 통계 ===== */
const Q={org:'gyeonggi',y:0,s:1,e:12};
const C_UP='#0F5AA6', C_PREV='#8A94A3';
const CH={};
const man=v=>v>=10000?(Math.round(v/1000)/10).toLocaleString()+'만':v.toLocaleString();
const ICON={
  sum:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/></svg>',
  avg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  st:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/></svg>',
  mo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>'};
Chart.defaults.font.family='Pretendard, "맑은 고딕", sans-serif';
Chart.defaults.font.size=12;
Chart.defaults.color='#4a5260';

function showTab(t){
  $('tabStat').style.display=t==='stat'?'':'none'; $('tabData').style.display=t==='data'?'':'none';
  $('tbStat').classList.toggle('on',t==='stat'); $('tbData').classList.toggle('on',t==='data');
  if(t==='stat') renderStat();
}
function initQ(){
  opts('qOrg',ORGS.map(o=>({v:o.orgId,t:o.orgNm}))); opts('qYear',YEARS.map(y=>({v:y,t:y+'년'})));
  const ms=Array.from({length:12},(_,i)=>({v:i+1,t:(i+1)+'월'})); opts('qMs',ms); opts('qMe',ms);
  if(!ORGS.some(o=>o.orgId===Q.org)) Q.org=ORGS[0].orgId;
  Q.y=YEARS[0];
  $('qOrg').value=Q.org; $('qYear').value=Q.y; $('qMs').value=Q.s; $('qMe').value=Q.e; checkQ();
}
function checkQ(){
  const s=+$('qMs').value, e=+$('qMe').value, m=$('qMsg');
  document.querySelectorAll('.qbar .pb').forEach(b=>{const k=b.dataset.p; b.classList.toggle('on',(k==='h1'&&s===1&&e===6)||(k==='h2'&&s===7&&e===12)||(k==='yr'&&s===1&&e===12));});
  if(e<s){ m.className='qm err'; m.textContent='종료월이 시작월보다 앞섬, 조회 월 재선택 필요'; $('qGo').disabled=true; return; }
  m.className='qm'; m.textContent='조회 기간 '+$('qYear').value+'.'+String(s).padStart(2,'0')+(s===e?'':' ~ '+$('qYear').value+'.'+String(e).padStart(2,'0'))+' ('+(e-s+1)+'개월)'; $('qGo').disabled=false;
}
function qPreset(b){ const k=b.dataset.p; if(k==='h1'){$('qMs').value=1;$('qMe').value=6;} else if(k==='h2'){$('qMs').value=7;$('qMe').value=12;} else {$('qMs').value=1;$('qMe').value=12;} checkQ(); applyQ(); }
async function applyQ(){
  const s=+$('qMs').value, e=+$('qMe').value; if(e<s) return;
  Q.org=$('qOrg').value; Q.y=+$('qYear').value; Q.s=s; Q.e=e;
  try{ await loadStat(Q.org); }catch(err){ tst('자료 조회 중 오류 발생'); return; }
  resetOn('월별'); renderStat();
}

function mk(id,cfg){ if(CH[id]) CH[id].destroy(); CH[id]=new Chart($(id),cfg); }
const axisY={grid:{color:'#eef1f5'},border:{display:false},ticks:{callback:v=>man(v)}};
const tipN={callbacks:{label:c=>' '+c.dataset.label+': '+(c.parsed.y??c.parsed.x).toLocaleString()+'명'}};

function renderStat(){
  ST=cur().ST;
  const has=!!postOf(Q.y);
  const hasVal=has&&ST.some(s=>Object.keys(cur().VAL).some(k=>k.startsWith(s.id+'|'+Q.y+'|')));
  if(!hasVal){
    $('statBody').style.display='none'; $('statEmpty').style.display='';
    $('statEmpty').textContent=has?'예시 수치는 경기철도만 구성 (다른 사업자도 같은 화면 구성)':orgNm(Q.org)+' '+Q.y+'년 자료 미등록, [자료 관리] 탭에서 등록 필요';
    return;
  }
  $('statBody').style.display=''; $('statEmpty').style.display='none';
  const ms=[]; for(let m=Q.s;m<=Q.e;m++) ms.push(m);
  const am=ms.filter(m=>mVal(ST[0],Q.y,m,0)!==null); /* am: 선택 기간 중 집계된 월 */
  const lastM=lastMonth(Q.y);
  $('basis').innerHTML='<b>자료 출처</b> '+BASIS;
  if(!am.length){
    $('statBody').style.display='none'; $('statEmpty').style.display='';
    $('statEmpty').textContent=Q.y+'년 '+Q.s+'~'+Q.e+'월 미집계 (최근 집계월 '+Q.y+'년 '+lastM+'월)';
    return;
  }
  const py=Q.y-1, hasPrev=!!postOf(py)&&ST.some(s=>Object.keys(cur().VAL).some(k=>k.startsWith(s.id+'|'+py+'|')));
  const both=(s,y,m)=>{const u=mVal(s,y,m,0); return u===null?null:u+(mVal(s,y,m,1)||0);};
  const sumSt=(y,m)=>{ let any=false,t=0; ST.forEach(s=>{const v=both(s,y,m); if(v!==null){any=true;t+=v;}}); return any?t:null; };
  const monCur=ms.map(m=>sumSt(Q.y,m));
  const monPrev=hasPrev?ms.map(m=>sumSt(py,m)):null;
  const stUp=ST.map(s=>am.reduce((a,m)=>a+(mVal(s,Q.y,m,0)||0),0)), stDn=ST.map(s=>am.reduce((a,m)=>a+(mVal(s,Q.y,m,1)||0),0));
  const stTot=ST.map((s,i)=>stUp[i]+stDn[i]);
  const total=monCur.reduce((a,b)=>a+(b||0),0);
  const prevTotal=hasPrev?am.reduce((a,m)=>a+(monPrev[ms.indexOf(m)]||0),0):0; /* 전년도 같은 집계 월만 비교 */
  const topSt=stTot.indexOf(Math.max(...stTot)), topMi=monCur.indexOf(Math.max(...monCur.filter(v=>v!==null)));
  const yoy=hasPrev&&prevTotal>0?((total-prevTotal)/prevTotal*100):null;
  const ae=am[am.length-1];
  const lbl=Q.y+'.'+String(Q.s).padStart(2,'0')+(Q.s===ae?'':' ~ '+Q.y+'.'+String(ae).padStart(2,'0'));
  const card=(ic,l,v,s)=>'<div class="kpi"><div class="ic">'+ICON[ic]+'</div><div><div class="l">'+l+'</div><div class="v num">'+v+'</div><div class="s">'+s+'</div></div></div>';
  $('kpis').innerHTML=
    card('sum','기간 총 이용 (승차+하차)',total.toLocaleString()+' <small>명</small>', yoy!==null?'전년 동기('+am.length+'개월) 대비 <span class="up">'+(yoy>=0?'+':'')+yoy.toFixed(1)+'%</span>':'전년 자료 없음')
   +card('avg','월평균 이용',Math.round(total/am.length).toLocaleString()+' <small>명</small>',lbl+' (집계 '+am.length+'개월)')
   +card('st','최다 이용 역',esc(ST[topSt].nm)+' <small>'+stTot[topSt].toLocaleString()+'명</small>','기간 이용의 '+(stTot[topSt]/total*100).toFixed(1)+'%')
   +card('mo','최다 이용 월',ms[topMi]+'월 <small>'+monCur[topMi].toLocaleString()+'명</small>','선택 기간 내 월별 최대');

  const ds=[{label:Q.y+'년',data:monCur,borderColor:C_UP,backgroundColor:'rgba(15,90,166,.10)',fill:true,borderWidth:2,pointRadius:4,pointBackgroundColor:C_UP,pointBorderColor:'#fff',pointBorderWidth:2,tension:.3}];
  if(hasPrev) ds.push({label:py+'년 (전년 동월)',data:monPrev,borderColor:C_PREV,borderDash:[5,4],borderWidth:2,pointRadius:3,pointBackgroundColor:C_PREV,fill:false,tension:.3});
  mk('cA',{type:'line',data:{labels:ms.map(m=>m+'월'),datasets:ds},
    options:{maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:14,boxHeight:2}},tooltip:tipN},
      scales:{x:{grid:{display:false}},y:axisY}}});

  const ord=ST.map((s,i)=>i).sort((a,b)=>stTot[b]-stTot[a]);
  mk('cB',{type:'bar',data:{labels:ord.map(i=>ST[i].nm),datasets:[{label:'승차+하차',data:ord.map(i=>stTot[i]),backgroundColor:C_UP,borderRadius:4,barThickness:20}]},
    options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:tipN},
      scales:{x:{grid:{color:'#eef1f5'},border:{display:false},ticks:{callback:v=>man(v)}},y:{grid:{display:false}}}}});

  /* 히트맵: 한 가지 색(파랑)의 진하기로 이용량 표시, 미집계 월은 '-' */
  const cells=ST.map(s=>ms.map(m=>both(s,Q.y,m)));
  const flat=cells.flat().filter(v=>v!==null), mn=Math.min(...flat), mx=Math.max(...flat);
  const lo=[0xEA,0xF1,0xFA], hi=[0x0F,0x5A,0xA6];
  const col=v=>{const t=mx===mn?1:(v-mn)/(mx-mn); return {bg:'rgb('+lo.map((c,i)=>Math.round(c+(hi[i]-c)*t)).join(',')+')',fg:t>.55?'#fff':'#1d2430'};};
  let h='<table class="hm"><tr><th></th>'+ms.map(m=>'<th>'+m+'월</th>').join('')+'</tr>';
  ST.forEach((s,i)=>{ h+='<tr><th class="r">'+esc(s.nm)+'</th>'+cells[i].map((v,j)=>{ if(v===null) return '<td class="na" title="'+esc(s.nm)+' '+ms[j]+'월: 미집계">-</td>'; const c=col(v); return '<td style="background:'+c.bg+';color:'+c.fg+'" title="'+esc(s.nm)+' '+ms[j]+'월: '+v.toLocaleString()+'명">'+(v/10000).toFixed(1)+'</td>';}).join('')+'</tr>'; });
  $('hm').innerHTML=h+'</table>';
  renderRpt();
}

/* ===== 역별 승하차 실적 표, 레포트 출력 ===== */
const RNAME={월별:'월별 승하차 실적',연도별:'연도별 승하차 실적'};
let RV='월별';
const ON={월별:[],연도별:[]};
const RYRS=()=>[...YEARS].sort((a,b)=>a-b);
const ymTxt=(y,m)=>y+'.'+String(m).padStart(2,'0');
function qMonths(){ const a=[]; for(let m=Q.s;m<=Q.e;m++) a.push(m); return a; }
function qLabel(){ return Q.s===Q.e?ymTxt(Q.y,Q.s):ymTxt(Q.y,Q.s)+' ~ '+ymTxt(Q.y,Q.e); }
const regd=y=>!!postOf(y);
const aggN=()=>qMonths().filter(m=>ST.length&&mVal(ST[0],Q.y,m,0)!==null).length;
/* 표 항목: 월별은 기간 합계 + 조회 월, 연도별은 등록 연도 (미등록 연도는 미집계) */
function groups(k){
  if((k||RV)==='월별') return [{k:'기간 합계('+qLabel()+')'}].concat(qMonths().map(m=>({k:ymTxt(Q.y,m)})));
  return RYRS().map(y=>{ const p=postOf(y); return {k:y+'년'+(p&&(p.ms>1||p.me<12)?'('+p.ms+'~'+p.me+'월)':'')}; });
}
function resetOn(k){ ON[k]=groups(k).map(()=>true); }
const sumN=a=>{ let any=false,t=0; a.forEach(v=>{ if(v!=null){any=true;t+=v;} }); return any?t:null; };
function cell(s,gi,si){
  if(RV==='월별') return gi===0 ? sumN(qMonths().map(m=>mVal(s,Q.y,m,si))) : mVal(s,Q.y,Q.s+gi-1,si);
  const y=RYRS()[gi]; if(!regd(y)) return null;
  return sumN(Array.from({length:12},(_,i)=>mVal(s,y,i+1,si)));
}
const cellTot=(gi,si)=>sumN(ST.map(s=>cell(s,gi,si)));
const onG=()=>groups().map((g,gi)=>({g,gi})).filter(x=>ON[RV][x.gi]);
const fmtC=v=>v==null?'<span class="na">미집계</span>':v.toLocaleString();

function setRV(k){ RV=k; renderRpt(); }
function renderRpt(){
  if(ON[RV].length!==groups().length) resetOn(RV);
  $('rvM').classList.toggle('on',RV==='월별'); $('rvY').classList.toggle('on',RV==='연도별');
  const ry=RYRS();
  $('rPeriod').textContent=RV==='월별' ? qLabel()+' (집계 '+aggN()+'개월)' : ry[0]+'년 ~ '+ry[ry.length-1]+'년';
  $('rCount').textContent=ST.length;
  const on=onG();
  if(!on.length){ $('rpt').innerHTML='<tbody><tr><td class="nodata">표시할 항목 없음, 일괄 설정에서 항목 선택 필요</td></tr></tbody>'; return; }
  let h='<thead><tr><th class="fx" rowspan="2">역명</th>'+on.map(x=>'<th colspan="2">'+x.g.k+'</th>').join('')+'</tr><tr>'+on.map(()=>'<th>승차</th><th>하차</th>').join('')+'</tr></thead><tbody>';
  h+='<tr class="tot"><td class="fx">합계</td>'+on.map(x=>'<td class="num">'+fmtC(cellTot(x.gi,0))+'</td><td class="num">'+fmtC(cellTot(x.gi,1))+'</td>').join('')+'</tr>';
  ST.forEach(s=>{ h+='<tr><td class="fx">'+esc(s.nm)+'</td>'+on.map(x=>'<td class="num">'+fmtC(cell(s,x.gi,0))+'</td><td class="num">'+fmtC(cell(s,x.gi,1))+'</td>').join('')+'</tr>'; });
  $('rpt').innerHTML=h+'</tbody>';
}

/* 일괄 설정 */
function openSet(){
  $('setBox').innerHTML='<h4>'+RNAME[RV]+' 항목</h4>'+groups().map((g,gi)=>'<label><input type="checkbox" data-gi="'+gi+'"'+(ON[RV][gi]?' checked':'')+'> '+g.k+'</label>').join('');
  $('mSet').classList.add('on');
}
function resetSet(){ $('setBox').querySelectorAll('input').forEach(c=>c.checked=true); }
function applySet(){ $('setBox').querySelectorAll('input').forEach(c=>ON[RV][+c.dataset.gi]=c.checked); closeM('mSet'); renderRpt(); tst('표 항목 적용'); }

/* 엑셀(.xlsx) 다운로드: 화면 표와 선택 항목 그대로 */
const pad2=n=>String(n).padStart(2,'0');
function ymd(){ const d=new Date(); return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate()); }
function exportExcel(){
  const tbl=$('rpt'), on=orgNm(Q.org), base='민자철도_'+RNAME[RV].replace(/ /g,'')+'_'+on+'_'+ymd();
  try{
    if(window.XLSX){ XLSX.writeFile(XLSX.utils.table_to_book(tbl,{sheet:on}),base+'.xlsx'); tst('엑셀(.xlsx) 내려받기 / 화면 표와 선택 항목 그대로'); }
    else { downloadCSV(tbl,base+'.csv'); tst('엑셀 라이브러리 미로딩, CSV로 저장'); }
  }catch(err){ downloadCSV(tbl,base+'.csv'); tst('CSV로 저장'); }
}
function downloadCSV(tbl,fname){
  const rows=[];
  tbl.querySelectorAll('tr').forEach(tr=>{ const c=[];
    tr.querySelectorAll('th,td').forEach(cl=>{ const t=(cl.innerText||'').replace(/\s+/g,' ').trim(); c.push('"'+t.replace(/"/g,'""')+'"'); for(let i=1;i<(cl.colSpan||1);i++) c.push('""'); });
    rows.push(c.join(',')); });
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'})); a.download=fname;
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
}

/* 레포트 (발주처 양식): 행은 월(연도), 열은 합계 + 역명, 역 8개 초과 시 표 분할 */
function nowStamp(){ const d=new Date(); return d.getFullYear()+'. '+pad2(d.getMonth()+1)+'. '+pad2(d.getDate())+'. '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function docNo(){ const d=new Date(); return 'CPPR-RPT-'+ymd()+'-'+pad2(d.getHours())+pad2(d.getMinutes()); }
const RPT_STN=8;
const fmt2=v=>v==null?'<span class="na2">미집계</span>':v.toLocaleString();
const addNull=(a,b)=>a==null&&b==null?null:(a||0)+(b||0);
function rptTable(rows,head,withSub){
  const ch=[]; for(let i=0;i<ST.length;i+=RPT_STN) ch.push(ST.slice(i,i+RPT_STN));
  return ch.map(c=>{
    let t='<table class="ptbl"><colgroup><col class="c0">'+(withSub?'<col class="c1">':'')+'<col class="ct">'+c.map(()=>'<col>').join('')+'</colgroup>'
      +'<thead><tr><th class="tx"'+(withSub?' colspan="2"':'')+'>'+head+'</th><th class="tx ptc">합계</th>'+c.map(s=>'<th class="tx">'+esc(s.nm)+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{ t+='<tr>'+(r.span?'<td class="k"'+(r.span>1?' rowspan="'+r.span+'"':'')+'>'+r.k+'</td>':'')
      +(withSub?'<td class="tx">'+r.sb+'</td>':'')+'<td class="ptc">'+fmt2(r.tot)+'</td>'+c.map(s=>'<td>'+fmt2(r.v(s))+'</td>').join('')+'</tr>'; });
    return t+'</tbody></table>';
  }).join('');
}
function reportTable(){
  const SUB=['승차','하차'], all=onG();
  const grpRows=gs=>{ const r=[]; gs.forEach(x=>SUB.forEach((sb,si)=>r.push({k:x.g.k,sb,span:si===0?2:0,tot:cellTot(x.gi,si),v:s=>cell(s,x.gi,si)}))); return r; };
  if(RV!=='월별') return rptTable(grpRows(all),'연도',true);
  let h='';
  if(ON['월별'][0]){
    const t=f=>addNull(f(0),f(1));
    const rows=SUB.map((sb,si)=>({k:sb,span:1,tot:cellTot(0,si),v:s=>cell(s,0,si)}))
      .concat([{k:'계',span:1,tot:t(si=>cellTot(0,si)),v:s=>t(si=>cell(s,0,si))}]);
    h+='<div class="sub-h">2-1. 기간 합계 ('+qLabel()+')</div>'+rptTable(rows,'구분',false);
  }
  const mons=all.filter(x=>x.gi>0);
  if(mons.length) h+='<div class="sub-h">'+(ON['월별'][0]?'2-2. ':'')+'월별 실적</div>'+rptTable(grpRows(mons),'월',true);
  return h;
}
function reportSummary(){
  const ry=RYRS(), gi=RV==='월별'?0:ry.length-1, up=cellTot(gi,0)||0, dn=cellTot(gi,1)||0;
  const lbl=RV==='월별'?'기간':ry[gi]+'년';
  const sc=(l,v,u)=>'<div class="sumcard"><div class="l">'+l+'</div><div class="v num">'+v+' <small>'+u+'</small></div></div>';
  return '<div class="sumbox">'+sc('대상 역 수',ST.length,'개 역')+sc(lbl+' 승차 합계',up.toLocaleString(),'명')+sc(lbl+' 하차 합계',dn.toLocaleString(),'명')+sc(lbl+' 총 이용',(up+dn).toLocaleString(),'명')+'</div>';
}
function buildReport(){
  /* 연도별 집계 월: 12개월 연도는 묶어서 표기 (예: 2023~2024년 12개월, 2025년 6개월) */
  const ry=RYRS(), r=ry.filter(regd), mc=y=>{const p=postOf(y); return p.me-p.ms+1;}, full=r.filter(y=>mc(y)===12), t=[];
  if(full.length) t.push((full.length>1&&full[full.length-1]-full[0]===full.length-1?full[0]+'~'+full[full.length-1]+'년':full.map(y=>y+'년').join(', '))+' 12개월');
  r.filter(y=>mc(y)<12).forEach(y=>t.push(y+'년 '+mc(y)+'개월'));
  const yrsAgg=t.join(', ')||'없음';
  $('paper').innerHTML=
    '<div class="doc-top"><div class="doc-org">한국교통연구원 민자철도관리지원센터</div><div class="doc-no">문서번호 : '+docNo()+'<br>출력일시 : '+nowStamp()+'</div></div>'
    +'<div class="doc-title"><h2>민자철도 '+RNAME[RV]+' 조회 결과</h2><div class="u"></div></div>'
    +'<table class="rmeta"><tr><th>대상 사업자</th><td>'+esc(orgNm(Q.org))+' ('+esc(orgLine(Q.org))+')</td><th>데이터 구분</th><td>'+RNAME[RV]+'</td></tr>'
    +'<tr><th>조회 기간</th><td>'+(RV==='월별'?qLabel()+' ('+(Q.e-Q.s+1)+'개월)':ry[0]+'년 ~ '+ry[ry.length-1]+'년')+'</td><th>조회 역 수</th><td>'+ST.length+'개 역</td></tr>'
    +'<tr><th>자료 출처</th><td>'+BASIS+'</td><th>집계 월</th><td>'+(RV==='월별'?aggN()+'개월 / 선택 '+(Q.e-Q.s+1)+'개월':yrsAgg)+'</td></tr></table>'
    +'<h3 class="sec-h">1. 종합 요약</h3>'+reportSummary()
    +'<h3 class="sec-h">2. 세부 조회 결과</h3>'+reportTable()
    +'<div class="pfoot">본 레포트는 CPPRMS 승하차 데이터 관리의 조회 조건 및 선택 항목 기준으로 출력됨</div>';
}
function openReport(){
  if(!onG().length){ tst('출력할 항목 없음, 일괄 설정에서 항목 선택 필요'); return; }
  buildReport(); $('rmask').classList.add('on'); document.body.style.overflow='hidden';
}
function closeReport(){ $('rmask').classList.remove('on'); document.body.style.overflow=''; }
/* PDF 저장: 브라우저 안에서 PDF 파일 생성, 실패 시 인쇄로 대체 */
function savePdf(){
  const fname='민자철도_레포트_'+RNAME[RV].replace(/ /g,'')+'_'+orgNm(Q.org)+'_'+ymd()+'.pdf';
  if(!window.html2pdf){ window.print(); return; }
  tst('PDF 생성 중');
  html2pdf().set({margin:6,filename:fname,image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,backgroundColor:'#ffffff',scrollX:0,scrollY:0},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from($('paper')).save()
    .then(()=>tst('PDF 파일 내려받기 완료')).catch(()=>window.print());
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeM('mSet'); closeReport(); } });

/* 시작: 사업자, 등록 자료, 기본 사업자 통계 자료를 받은 뒤 그리기 */
(async function init(){
  try{
    const d=await getJSON('/rideMng/init.json'); ORGS=d.orgs;
    await loadPosts(); calcYears();
    initSel(); render(); initQ();
    await loadStat(Q.org); resetOn('월별'); renderStat();
  }catch(e){
    $('statBody').style.display='none'; $('statEmpty').style.display=''; $('statEmpty').textContent='자료를 불러오지 못함, 서버 상태 확인 필요';
  }
})();
