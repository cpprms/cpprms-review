/* 레포트 관리 화면 스크립트
   개선안 데모 v3.0 의 화면 로직을 그대로 쓰고, 자료(사업자, 사업 현황, 역, 시설 수량)만 서버에서 받는다.
   서버 주소: /report/init.json, /report/org.json */

const $=id=>document.getElementById(id);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toT; function tst(m){const e=$('toast');e.textContent=m;e.classList.add('on');clearTimeout(toT);toT=setTimeout(()=>e.classList.remove('on'),2000);}
async function getJSON(url){ const r=await fetch(CTX+url,{headers:{'Accept':'application/json'}}); if(!r.ok) throw new Error(r.status); return r.json(); }

/* ===== 서버 자료 ===== */
let ORGS=[];        /* [{orgId, orgNm, lineNm}] */
let FCLT_ITEMS=[];  /* [{fcltId, fcltGrp, fcltNm, ord}] */
let ST=[];          /* 현재 사업자 역 [{id, nm}] */
let BIZ=null;       /* 현재 사업자 사업 현황 (없으면 null) */
let FV={};          /* 시설 수량: 'stnId|fcltId' -> cnt */
let ORGID='gyeonggi', ORGNM='', ORGLINE='-';
const hasData=()=>!!BIZ;
const hasFac=()=>ST.length>0&&Object.keys(FV).length>0;

async function loadOrg(orgId){
  const d=await getJSON('/report/org.json?orgId='+encodeURIComponent(orgId));
  ORGID=d.org.orgId; ORGNM=d.org.orgNm; ORGLINE=d.org.lineNm||'-';
  ST=d.stations.map(s=>({id:s.stnId,nm:s.stnNm}));
  FV={}; d.fclt.forEach(f=>{ FV[f.stnId+'|'+f.fcltId]=f.cnt; });
  const b=d.biz;
  BIZ=b?{
    base:b.base.map(x=>[x.itemNm,x.itemVal]),
    outline:b.biz.outline,
    purpose:b.purpose.map(x=>x.itemNm),
    steps:b.steps.map(x=>[x.itemVal,x.itemNm]),
    rail:b.rail.map(x=>[x.itemNm,x.itemVal]),
    kpi:{len:b.biz.kpiLen,st:b.biz.kpiStnCnt,cost:b.biz.kpiCost,term:b.biz.kpiTerm,termTxt:b.biz.kpiTermTxt}
  }:null;
  buildDSS();
}
const baseVal=k=>{ if(!BIZ) return ''; const r=BIZ.base.find(x=>x[0]===k); return r&&r[1]!=null?r[1]:''; };

/* ===== 조회 기간 상태 (시설 정보는 연도만 표기) ===== */
const P={y:2025,s:1,e:6};
const ymTxt=(y,m)=>y+'.'+String(m).padStart(2,'0');
function periodLabel(){ return P.s===P.e ? ymTxt(P.y,P.s) : ymTxt(P.y,P.s)+' ~ '+ymTxt(P.y,P.e); }

/* ===== 데이터셋: 편의, 이동, 안전 (시설 항목은 서버 cpms_fclt_item 순서) ===== */
const GRP={편의:'CONV',이동:'MOVE',안전:'SAFE'};
const DSNAME={편의:'편의시설 정보',이동:'이동시설 정보',안전:'안전시설 정보'};
const DSS={};
function buildDSS(){
  Object.keys(GRP).forEach(k=>{
    const prev=DSS[k], items=FCLT_ITEMS.filter(f=>f.fcltGrp===GRP[k]);
    DSS[k]={name:DSNAME[k], grouped:false,
      cols:items.map((f,ci)=>({k:f.fcltNm,id:f.fcltId,on:prev&&prev.cols[ci]?prev.cols[ci].on:true})),
      /* 역 값: 행이 없으면 null(미집계), 0 은 시설 없음 */
      val:(s,ci)=>{ const v=FV[s.id+'|'+items[ci].fcltId]; return v==null?null:v; },
      /* 합계: 집계된 역만 합산, 전부 미집계면 null */
      tot:(ci)=>{ let any=false,t=0; ST.forEach(s=>{ const v=FV[s.id+'|'+items[ci].fcltId]; if(v!=null){any=true;t+=v;} }); return any?t:null; } };
  });
}
let CUR="편의";
let showLine=true;

/* 엑셀(.xlsx) 다운로드 (브라우저 안에서 생성) */
function pad(n){return String(n).padStart(2,'0');}
function ymd(){const d=new Date();return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());}
function exportExcel(){
  if(!hasFac()){ tst(ORGNM+' 자료 미등록으로 다운로드할 내용 없음'); return; }
  const tbl=$('rpt');
  const base='민자철도_'+(DSS[CUR].name.replace(/[^가-힣0-9A-Za-z]/g,'')||'조회')+'_'+ORGNM+'_'+ymd();
  try{
    if(window.XLSX && tbl){ XLSX.writeFile(XLSX.utils.table_to_book(tbl,{sheet:ORGNM}), base+'.xlsx'); tst('엑셀(.xlsx) 내려받기 / 화면 표와 선택 항목 그대로'); }
    else { downloadCSV(tbl, base+'.csv'); tst('엑셀 라이브러리 미로딩, CSV로 저장'); }
  }catch(err){ downloadCSV(tbl, base+'.csv'); tst('CSV로 저장'); }
}
function downloadCSV(tbl,fname){
  if(!tbl) return;
  const rows=[];
  tbl.querySelectorAll('tr').forEach(tr=>{
    const c=[];
    tr.querySelectorAll('th,td').forEach(cell=>{ const cs=cell.colSpan||1; const t=(cell.innerText||'').replace(/\s+/g,' ').trim();
      c.push('"'+t.replace(/"/g,'""')+'"'); for(let i=1;i<cs;i++)c.push('""'); });
    rows.push(c.join(','));
  });
  const blob=new Blob(['﻿'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
}

function fmt(v){ if(v==null) return '<span class="badge-na">미집계</span>'; return v.toLocaleString(); }
function fmt2(v){ if(v==null) return '<span class="na2">미집계</span>'; return v.toLocaleString(); }

/* ===== 조회 기간 (월 조건은 시설 정보에서 쓰지 않음, 데모와 같은 동작 유지) ===== */
function fillMonthSel(){ ['selMS','selME'].forEach(id=>{ $(id).innerHTML=Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'월</option>').join(''); }); }
function selVals(){ return {y:+$('selYear').value, s:+$('selMS').value, e:+$('selME').value}; }
function setSel(y,s,e){ $('selYear').value=y; $('selMS').value=s; $('selME').value=e; }
function checkPeriod(){
  const v=selVals(), msg=$('pmsg'), btn=$('applyBtn');
  document.querySelectorAll('.cond .preset button').forEach(b=>{ const k=b.dataset.p;
    b.classList.toggle('on',(k==='h1'&&v.s===1&&v.e===6)||(k==='h2'&&v.s===7&&v.e===12)||(k==='yr'&&v.s===1&&v.e===12)); });
  msg.className='pmsg'; msg.textContent=''; btn.disabled=false;
}
function preset(b){ const y=+$('selYear').value, k=b.dataset.p;
  if(k==='h1') setSel(y,1,6); else if(k==='h2') setSel(y,7,12); else setSel(y,1,12);
  const v=selVals(); P.y=v.y; P.s=v.s; P.e=v.e; updateMeta(); checkPeriod(); draw(); }
function updateMeta(){ $('mPeriod').textContent=P.y+'년 기준'; }

/* 고정열 left offset */
const FXW={yr:66,org:106,st:94,line:132};
function fxStyle(which){ let left=0; if(which==='org')left=FXW.yr; else if(which==='st')left=FXW.yr+FXW.org; else if(which==='line')left=FXW.yr+FXW.org+FXW.st;
  return 'left:'+left+'px;min-width:'+FXW[which]+'px;max-width:'+FXW[which]+'px;'; }

function draw(){
  const ds=DSS[CUR];
  const lineOn=$('col_호선') ? $('col_호선').checked : showLine;
  showLine=lineOn;
  const fixed=[['yr','연도'],['org','사업자'],['st','역명']]; if(lineOn) fixed.push(['line','호선']);
  const YR=String(P.y);
  const lastFxKey=lineOn?'line':'st';
  let html='';
  if(!hasFac()){
    html='<thead><tr>'+fixed.map(f=>'<th class="tx">'+f[1]+'</th>').join('')+'<th class="tx">데이터</th></tr></thead>'
      +'<tbody><tr><td class="tx" colspan="'+(fixed.length+1)+'" style="padding:34px;color:var(--gray)">'+esc(ORGNM)+' '+ds.name+' 자료 미등록</td></tr></tbody>';
    $('rpt').innerHTML=html; $('rcount').textContent=0; renderKpis();
    return;
  }
  const onC=ds.cols.map((c,ci)=>({c,ci})).filter(x=>x.c.on);
  html+='<thead><tr>';
  fixed.forEach(f=>{const cls='fx tx'+(f[0]===lastFxKey?' b':''); html+='<th class="'+cls+'" style="'+fxStyle(f[0])+'top:0;">'+f[1]+'</th>';});
  onC.forEach(x=>html+='<th class="tx">'+esc(x.c.k)+'</th>');
  html+='</tr></thead><tbody>';
  html+='<tr class="tot">';
  fixed.forEach(f=>{const cls='fx tx'+(f[0]===lastFxKey?' b':''); let t=''; if(f[0]==='st')t='합계'; else if(f[0]==='yr')t=YR; else if(f[0]==='org')t=esc(ORGNM);
    html+='<td class="'+cls+'" style="'+fxStyle(f[0])+'">'+t+'</td>';});
  onC.forEach(x=>{const v=ds.tot(x.ci); html+='<td class="tx num '+(v===0?'zero':'')+'">'+fmt(v)+'</td>';});
  html+='</tr>';
  ST.forEach((s,ri)=>{html+='<tr>';
    fixed.forEach(f=>{const cls='fx tx'+(f[0]===lastFxKey?' b':''); let t=''; if(f[0]==='st')t=esc(s.nm); else if(f[0]==='yr')t=YR; else if(f[0]==='org')t=esc(ORGNM); else t=esc(ORGLINE);
      html+='<td class="'+cls+'" style="'+fxStyle(f[0])+'">'+t+'</td>';});
    onC.forEach(x=>{const v=ds.val(s,x.ci,ri); html+='<td class="tx num '+(v===0?'zero':'')+'">'+fmt(v)+'</td>';});
    html+='</tr>';});
  html+='</tbody>';
  $('rpt').innerHTML=html;
  $('rcount').textContent=ST.length;
  renderKpis();
}

/* ===== 일괄 설정 ===== */
function buildPop(){
  const ds=DSS[CUR]; const box=$('datacols');
  let h='<h4>시설 항목</h4>';
  ds.cols.forEach((c,ci)=>{ h+='<label><input type="checkbox" '+(c.on?'checked':'')+' onchange="DSS[\''+CUR+'\'].cols['+ci+'].on=this.checked"> '+esc(c.k)+'</label>'; });
  box.innerHTML=h;
  $('col_호선').checked=showLine;
}
function openPop(){buildPop();$('mask').classList.add('on');$('pop').classList.add('on');}
function closePop(){$('mask').classList.remove('on');$('pop').classList.remove('on');}
function applyPop(){draw();closePop();tst('컬럼 구성 적용');}
function resetCols(){DSS[CUR].cols.forEach(c=>c.on=true); showLine=true; buildPop(); tst('기본값으로 초기화');}

/* ===== 레포트 출력 ===== */
function nowStamp(){ const d=new Date(); const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'. '+p(d.getMonth()+1)+'. '+p(d.getDate())+'. '+p(d.getHours())+':'+p(d.getMinutes()); }
function docNo(){ const d=new Date(); const p=n=>String(n).padStart(2,'0');
  return 'CPPR-RPT-'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes()); }

/* ===== 사업 현황: 현행 레포트(rpt02) 항목 순서 ===== */
const kvVal=v=>v==null?'<span class="na2">미등록</span>':esc(v);
function kvTable(list){
  let h='<table class="kv">';
  for(let i=0;i<list.length;i+=2){ const a=list[i], b=list[i+1];
    h+='<tr><th>'+esc(a[0])+'</th><td'+(b?'':' colspan="3"')+'>'+kvVal(a[1])+'</td>'+(b?'<th>'+esc(b[0])+'</th><td>'+kvVal(b[1])+'</td>':'')+'</tr>'; }
  return h+'</table>';
}
function stepsTable(){
  let h='<table class="kv steps"><colgroup><col style="width:80px"><col><col style="width:80px"><col></colgroup><tr><th>연월</th><th>추진단계</th><th>연월</th><th>추진단계</th></tr>';
  const S=BIZ.steps, half=Math.ceil(S.length/2);
  for(let i=0;i<half;i++){ const a=S[i], b=S[i+half];
    h+='<tr><td class="ym">'+esc(a[0])+'</td><td>'+esc(a[1])+'</td>'+(b?'<td class="ym">'+esc(b[0])+'</td><td>'+esc(b[1])+'</td>':'<td></td><td></td>')+'</tr>'; }
  return h+'</table>';
}
/* hd(번호, 제목): 화면은 소제목, 레포트는 절 제목 */
function bizHtml(hd){
  const sec=h=>'<div class="sec">'+h+'</div>';
  return sec(hd(1,'사업 기본정보')+kvTable(BIZ.base))
    +sec(hd(2,'사업추진 정보')+'<table class="kv"><tr><th>사업 개요</th><td>'+esc(BIZ.outline)+'</td></tr>'
    +'<tr><th>사업 목적</th><td><ul>'+BIZ.purpose.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></td></tr></table>'+stepsTable())
    +sec(hd(3,'철도시설 정보')+kvTable(BIZ.rail));
}
function renderBiz(){
  $('bizSub').innerHTML=hasData()?'<span class="tag main">'+esc(baseVal('사업명'))+'</span><span class="tag">'+esc(baseVal('철도유형'))+'</span><span class="tag">'+esc(baseVal('민자사업유형'))+'</span>'+'<span class="who">사업시행자 <b>'+esc(baseVal('사업시행자'))+'</b><i></i>열차운영기관 <b>'+esc(baseVal('열차운영기관'))+'</b></span>':'';
  $('bizBody').innerHTML=hasData()?bizHtml((n,t)=>'<h3>'+t+'</h3>')
    :'<div style="padding:34px;text-align:center;color:var(--gray)">'+esc(ORGNM)+' 사업 현황 자료 미등록</div>';
}
/* 사업 현황 엑셀: 현행 rpt02 [Export to Excel]과 같은 구분, 항목, 내용 3열 */
function exportBizExcel(){
  if(!hasData()){ tst(ORGNM+' 자료 미등록으로 다운로드할 내용 없음'); return; }
  const A=[["구분","항목","내용"]], txt=v=>v==null?'미등록':v;
  BIZ.base.forEach(r=>A.push(["사업 기본정보",r[0],txt(r[1])]));
  A.push(["사업추진 정보","사업 개요",BIZ.outline],["사업추진 정보","사업 목적",BIZ.purpose.join('\n')]);
  BIZ.steps.forEach(r=>A.push(["사업 추진단계",r[1],r[0]]));
  BIZ.rail.forEach(r=>A.push(["철도시설 정보",r[0],txt(r[1])]));
  const base='민자철도_사업현황_'+ORGNM+'_'+ymd();
  if(window.XLSX){ const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(A),ORGNM); XLSX.writeFile(wb,base+'.xlsx');
    tst('엑셀(.xlsx) 내려받기 / 구분, 항목, 내용'); return; }
  const csv=A.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'})); a.download=base+'.csv';
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},800);
  tst('엑셀 라이브러리 미로딩, CSV로 저장');
}

/* 역별 시설 표: 행은 시설 항목, 열은 합계 + 역명. A4 폭 고정, 역이 8개를 넘으면 표를 나눔 */
const RPT_STN=8;
function rptChunks(){ const a=[]; for(let i=0;i<ST.length;i+=RPT_STN) a.push(ST.slice(i,i+RPT_STN).map((s,k)=>({s,ri:i+k}))); return a; }
function rptTable(rows,head){
  return rptChunks().map(ch=>{
    let t='<table class="ptbl"><colgroup><col class="c0"><col class="ct">'+ch.map(()=>'<col>').join('')+'</colgroup>'
      +'<thead><tr><th class="tx">'+head+'</th><th class="tx ptc">합계</th>'+ch.map(x=>'<th class="tx">'+esc(x.s.nm)+'</th>').join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{ t+='<tr><td class="k">'+esc(r.k)+'</td><td class="ptc">'+fmt2(r.tot)+'</td>'+ch.map(x=>'<td>'+fmt2(r.v(x.s,x.ri))+'</td>').join('')+'</tr>'; });
    return t+'</tbody></table>';
  }).join('');
}
function facTable(k){
  const ds=DSS[k];
  const rows=ds.cols.map((c,ci)=>({c,ci})).filter(x=>x.c.on).map(x=>({k:x.c.k,tot:ds.tot(x.ci),v:(s,ri)=>ds.val(s,x.ci,ri)}));
  if(!ST.length) return '<p class="sub-h" style="font-weight:400">시설 자료 미등록</p>';
  return rows.length?rptTable(rows,'시설 항목'):'<p class="sub-h" style="font-weight:400">선택 항목 없음</p>';
}
function buildReport(){
  $('paper').innerHTML =
    '<div class="doc-top"><div class="doc-org">한국교통연구원 민자철도관리지원센터</div>'
    +'<div class="doc-no">문서번호 : '+docNo()+'<br>출력일시 : '+nowStamp()+'</div></div>'
    +'<div class="doc-title"><h2>민자철도 사업현황 레포트</h2><div class="u"></div></div>'
    +'<table class="meta"><tr><th>대상 사업자</th><td>'+esc(ORGNM)+' ('+esc(ORGLINE)+')</td><th>사업명</th><td>'+esc(baseVal('사업명'))+'</td></tr>'
    +'<tr><th>시설 기준 시점</th><td>'+P.y+'년 운영사 제출 시설 현황</td><th>조회 역 수</th><td>'+ST.length+'개 역</td></tr></table>'
    +bizHtml((n,t)=>'<h3 class="sec-h">'+n+'. '+t+'</h3>')
    +'<h3 class="sec-h pb">4. 역별 시설 정보</h3>'
    +'<div class="sub-h">4-1. 편의시설</div>'+facTable('편의')
    +'<div class="sub-h">4-2. 이동시설</div>'+facTable('이동')
    +'<div class="sub-h">4-3. 안전시설</div>'+facTable('안전')
    +'<div class="pfoot">본 레포트는 CPPRMS 레포트 관리의 사업자 선택 및 시설 항목 선택 기준으로 출력됨</div>';
}
function openReport(){ if(!hasData()){ tst(ORGNM+' 자료 미등록으로 출력할 레포트 없음'); return; } buildReport(); $('rmask').classList.add('on'); document.body.style.overflow='hidden'; tst('선택한 조건과 항목으로 레포트 생성'); }
function closeReport(){ $('rmask').classList.remove('on'); document.body.style.overflow=''; }
function printReport(){ window.print(); }
/* PDF 저장: 브라우저 안에서 PDF 파일 생성, 실패 시 인쇄로 대체 */
function savePdf(){
  const src=$('paper'); if(!src) return;
  const fname='민자철도_사업현황레포트_'+ORGNM+'_'+ymd()+'.pdf';
  if(!window.html2pdf){ try{ window.print(); }catch(e){ tst('PDF 저장이 차단된 환경, 브라우저에서 열기 필요'); } return; }
  tst('PDF 생성 중');
  html2pdf().set({ margin:6, filename:fname, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,backgroundColor:'#ffffff'},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}, pagebreak:{mode:['css','legacy']} }).from(src).save()
    .then(()=>tst('PDF 파일 내려받기 완료 / 발주처 양식'))
    .catch(()=>{ try{ window.print(); }catch(e){ tst('PDF 저장이 차단된 환경, 브라우저에서 열기 필요'); } });
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ closeReport(); closePop(); }});

/* ===== 화면 틀: 탭(사업 현황, 시설 정보), 요약 수치 ===== */
const TABDS={F:["편의","이동","안전"]};
let TAB="P";
const IC={
  st:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  len:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 8v8M21 8v8"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  sum:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  fac:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6v6H9z"/></svg>'
};
function kpi(ic,l,v,unit,s){ return '<div class="kpi"><div class="ic">'+ic+'</div><div><div class="l">'+l+'</div><div class="v num">'+v+' <small>'+unit+'</small></div><div class="s">'+s+'</div></div></div>'; }
function renderKpis(){
  const el=$('kpis');
  $('srcLine').innerHTML='<b>자료 출처</b> '+(TAB==='P'?'운영사 제출 자료':'운영사 제출 시설 현황');
  if(TAB==='P'?!hasData():!hasFac()){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='grid';
  if(TAB==='P'){ const K=BIZ.kpi;
    el.innerHTML=kpi(IC.len,'연장',esc(K.len),'km',esc(baseVal('사업구간')))+kpi(IC.st,'정거장',K.st==null?'-':K.st,'개 역',esc(ORGNM)+' ('+esc(ORGLINE)+')')
      +kpi(IC.sum,'총사업비',esc(K.cost),'억원','민자사업유형 '+esc(baseVal('민자사업유형')))+kpi(IC.cal,'관리운영기간',esc(K.term),'년',esc(K.termTxt));
    return; }
  const ds=DSS[CUR]; let h=kpi(IC.st,'대상 역 수',ST.length,'개 역',esc(ORGNM)+' ('+esc(ORGLINE)+')');
  ds.cols.map((c,ci)=>({c,ci})).filter(x=>x.c.on).slice(0,3).forEach(x=>{ const v=ds.tot(x.ci);
    h+=kpi(IC.fac,esc(x.c.k)+' 합계',v==null?'미집계':v.toLocaleString(),'개',P.y+'년 기준'); });
  el.innerHTML=h;
}
function setTab(t){
  TAB=t; $('tbP').classList.toggle('on',t==='P'); $('tbF').classList.toggle('on',t==='F');
  $('facCond').style.display=t==='F'?'flex':'none'; $('monthcond').style.display='none';
  $('bizCard').style.display=t==='P'?'':'none'; $('facCard').style.display=t==='F'?'':'none';
  if(t==='F'){ $('selDs').innerHTML=TABDS.F.map(k=>'<option value="'+k+'">'+DSS[k].name+'</option>').join(''); pickDs(TABDS.F[0]); }
  else { renderBiz(); renderKpis(); }
}
function pickDs(k){
  CUR=k; $('selDs').value=k; $('dsname').textContent=DSS[CUR].name;
  updateMeta(); checkPeriod(); draw();
}
async function applyQuery(){
  try{ await loadOrg($('selOrg').value); }catch(e){ tst('자료 조회 중 오류 발생'); return; }
  if(TAB==='P'){ renderBiz(); renderKpis(); tst(hasData()?ORGNM+' 사업 현황 조회':ORGNM+' 자료 미등록'); return; }
  P.y=+$('selYear').value; updateMeta(); draw(); tst(ORGNM+' '+DSS[CUR].name+' 조회');
}

/* 시작: 사업자, 시설 항목, 기본 사업자 자료를 받은 뒤 그리기 */
(async function init(){
  try{
    const d=await getJSON('/report/init.json'); ORGS=d.orgs; FCLT_ITEMS=d.fcltItems;
    if(!ORGS.some(o=>o.orgId===ORGID)) ORGID=ORGS[0].orgId;
    $('selOrg').innerHTML=ORGS.map(o=>'<option value="'+esc(o.orgId)+'"'+(o.orgId===ORGID?' selected':'')+'>'+esc(o.orgNm)+'</option>').join('');
    fillMonthSel(); setSel(P.y,P.s,P.e);
    await loadOrg(ORGID);
    setTab('P');
  }catch(e){ $('bizBody').innerHTML='<div style="padding:34px;text-align:center;color:var(--gray)">자료를 불러오지 못함, 서버 상태 확인 필요</div>'; }
})();
