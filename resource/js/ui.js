/* CPPRMS 화면 공통 동작 (v2.0, 2026-11-03)
   상단 메뉴(메뉴 검색, 알림, 개선 포인트), 목록(검색, 쪽 나눔, 선택 삭제, 엑셀), 상세와 등록 모달, 상태 표시
   예시 자료는 각 화면 안에 있고 브라우저 안에서만 바뀜 */
(function (w) {
  'use strict';
  const d = document;
  const q = (s, p) => (p || d).querySelector(s);
  const qa = (s, p) => Array.from((p || d).querySelectorAll(s));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => (v == null || v === '' || isNaN(v)) ? (v == null ? '' : v) : Number(v).toLocaleString('ko-KR');

  /* 알림 문구 */
  let toT;
  function toast(m) {
    let e = d.getElementById('toast');
    if (!e) { e = d.createElement('div'); e.id = 'toast'; e.setAttribute('role', 'status'); d.body.appendChild(e); }
    e.textContent = m; e.classList.add('on');
    clearTimeout(toT); toT = setTimeout(() => e.classList.remove('on'), 1900);
  }

  /* 상태 표시: 글자에 따라 색 결정, 글자는 그대로 표시 */
  const ST_RULE = [
    [/미사용|비공개|미게시|게시 종료|기간 만료|기한 종료/, 'wait'],
    [/승인 대기|게시 대기|답변 대기|검토 대기/, 'warn'],
    [/반려|지연|오류|중지|미승인|차단|기한 경과|실패|탈락/, 'bad'],
    [/보완|임박|주의|요청|미답변|미제출|미등록|미작성|확인 필요|서류 미비/, 'warn'],
    [/완료|승인|게시 중|정상|확정|제출|사용|선정|공개|답변/, 'done'],
    [/진행|중|검토|접수|작성|예정/, 'ing']
  ];
  function st(text, cls) {
    if (!cls) { cls = 'wait'; for (const [re, c] of ST_RULE) { if (re.test(text)) { cls = c; break; } } }
    return '<span class="st ' + cls + '">' + esc(text) + '</span>';
  }

  /* 모달 */
  function modal(o) {
    const m = d.createElement('div');
    m.className = 'mask on';
    m.innerHTML = '<div class="modal" role="dialog" aria-modal="true" style="max-width:' + (o.width || 640) + 'px">' +
      '<div class="mh"><b>' + esc(o.title) + '</b><button class="x" aria-label="닫기">✕</button></div>' +
      '<div class="mb"></div><div class="mf"></div></div>';
    const body = q('.mb', m);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const foot = q('.mf', m);
    const close = () => { m.remove(); d.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); };
    (o.buttons || [{ t: '닫기' }]).forEach(b => {
      const bt = d.createElement('button');
      bt.className = 'btn' + (b.cls ? ' ' + b.cls : ''); bt.textContent = b.t;
      bt.onclick = () => { if (b.fn && b.fn(close) === false) return; if (!b.keep) close(); };
      foot.appendChild(bt);
    });
    if (!foot.children.length) foot.remove();
    q('.x', m).onclick = close;
    m.addEventListener('mousedown', e => { if (e.target === m) close(); });
    const onKey = e => { if (e.key === 'Escape') close(); };
    d.addEventListener('keydown', onKey);
    d.body.appendChild(m);
    const f = q('input,select,textarea,button:not(.x)', body) || q('.x', m);
    if (f) f.focus();
    return { el: m, body: body, close: close };
  }

  function confirmBox(msg, fn) {
    modal({ title: '확인', width: 420, body: '<p style="margin:4px 0;font-size:14px;line-height:1.6">' + esc(msg) + '</p>', buttons: [{ t: '취소' }, { t: '확인', cls: 'pri', fn: fn }] });
  }

  /* 입력 양식: fields [{key,label,type,options,req,def,hint,ph}] */
  let fid = 0;
  function form(fields, vals) {
    vals = vals || {};
    const g = d.createElement('div'); g.className = 'fgrid';
    fields.forEach(f => {
      const id = 'f' + (++fid);
      f._id = id;
      const v = vals[f.key] != null ? vals[f.key] : (f.def != null ? (typeof f.def === 'function' ? f.def() : f.def) : '');
      let inp;
      if (f.type === 'select') inp = '<select id="' + id + '">' + (f.req ? '' : '<option value="">선택</option>') + f.options.map(o => '<option' + (String(o) === String(v) ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
      else if (f.type === 'textarea') inp = '<textarea id="' + id + '" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea>';
      else if (f.type === 'file') inp = '<input type="file" id="' + id + '"' + (f.accept ? ' accept="' + f.accept + '"' : '') + '>';
      else inp = '<input id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '">';
      g.insertAdjacentHTML('beforeend', '<label for="' + id + '">' + esc(f.label) + (f.req ? '<span class="rq" aria-label="필수">*</span>' : '') + '</label><div>' + inp + (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '</div>');
    });
    const msg = d.createElement('div'); msg.className = 'fmsg'; msg.setAttribute('role', 'alert');
    const wrap = d.createElement('div'); wrap.appendChild(g); wrap.appendChild(msg);
    return {
      el: wrap,
      read() {
        const out = {}; let bad = null;
        fields.forEach(f => {
          const e = d.getElementById(f._id);
          e.classList.remove('inv');
          let v = f.type === 'file' ? (e.files[0] ? e.files[0].name : '') : e.value.trim();
          if (f.req && !v && !bad) { bad = f; e.classList.add('inv'); }
          out[f.key] = v;
        });
        if (bad) { msg.className = 'fmsg err'; msg.textContent = bad.label + '을(를) 입력하세요.'; d.getElementById(bad._id).focus(); return null; }
        return out;
      }
    };
  }

  /* 목록 */
  function list(cfg) {
    const root = typeof cfg.el === 'string' ? q(cfg.el) : cfg.el;
    const ps = cfg.pageSize || 10;
    let rows = cfg.rows.slice(), view = rows, page = 1;
    const sel = new Set();
    let seq = 0; rows.forEach(r => { r._k = ++seq; });

    const filt = (cfg.filters || []).map(f => {
      const id = 'q' + (++fid); f._id = id;
      let opts = f.options;
      if (f.type === 'select' && (!opts || opts === 'auto')) opts = Array.from(new Set(rows.map(r => r[f.key]).filter(v => v !== '' && v != null))).sort();
      if (f.type === 'select') return '<span><label for="' + id + '">' + esc(f.label) + '</label><select id="' + id + '"><option value="">전체</option>' + opts.map(o => '<option>' + esc(o) + '</option>').join('') + '</select></span>';
      return '<span><label for="' + id + '">' + esc(f.label) + '</label><input id="' + id + '" placeholder="' + esc(f.ph || '검색어 입력') + '"></span>';
    }).join('');

    const btns = (cfg.buttons || []).map((b, i) => {
      if (b === 'add') return '<button class="btn pri" data-b="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>' + esc((cfg.add && cfg.add.btn) || '등록') + '</button>';
      if (b === 'del') return '<button class="btn" data-b="del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>선택 삭제</button>';
      if (b === 'excel') return '<button class="btn" data-b="excel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M8 11l4 4 4-4M4 21h16"/></svg>엑셀 다운로드</button>';
      return '<button class="btn' + (b.cls ? ' ' + b.cls : '') + '" data-b="c' + i + '">' + esc(b.t) + '</button>';
    }).join('');

    root.innerHTML =
      (filt ? '<section class="card lfilter"><div class="filter">' + filt + '<button class="btn pri" data-b="q">조회</button><button class="btn" data-b="reset">초기화</button></div></section>' : '') +
      '<section class="card lbody"><div class="lbar"><span class="total">전체 <b class="num"></b>건</span>' + (cfg.note ? '<span class="s" style="font-size:12px;color:var(--gray)">' + esc(cfg.note) + '</span>' : '') + '<span class="r">' + btns + '</span></div>' +
      '<div class="dscroll" style="margin-top:0;border:0"><table class="lst"><thead><tr>' +
      (cfg.check ? '<th class="chk"><input type="checkbox" aria-label="전체 선택"></th>' : '') +
      '<th>번호</th>' + cfg.cols.map(c => '<th' + (c.align === 'l' ? ' class="l"' : '') + (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.label) + '</th>').join('') +
      '</tr></thead><tbody></tbody></table></div><div class="pager"></div></section>';

    const tb = q('tbody', root), pager = q('.pager', root), totalEl = q('.total b', root), chkAll = q('thead input', root);

    function apply() {
      view = rows.filter(r => (cfg.filters || []).every(f => {
        const v = d.getElementById(f._id).value.trim();
        if (!v) return true;
        if (f.type === 'select') return String(r[f.key]) === v;
        const keys = f.fields || [f.key];
        return keys.some(k => String(r[k] == null ? '' : r[k]).toLowerCase().includes(v.toLowerCase()));
      }));
      page = 1; render();
    }

    function cell(c, r) {
      let h;
      if (c.render) h = c.render(r);
      else if (c.st) h = st(r[c.key]);
      else if (c.num) h = '<span class="num">' + num(r[c.key]) + '</span>';
      else h = esc(r[c.key]);
      if (c.link) h = '<button class="lnk" data-open="' + r._k + '">' + h + '</button>';
      return '<td class="' + (c.align || '') + '">' + h + '</td>';
    }

    function render() {
      totalEl.textContent = view.length.toLocaleString('ko-KR');
      const pages = Math.max(1, Math.ceil(view.length / ps));
      if (page > pages) page = pages;
      const slice = view.slice((page - 1) * ps, page * ps);
      const ncol = cfg.cols.length + 1 + (cfg.check ? 1 : 0);
      tb.innerHTML = slice.length ? slice.map((r, i) =>
        '<tr class="' + (sel.has(r._k) ? 'sel' : '') + '">' +
        (cfg.check ? '<td class="chk"><input type="checkbox" data-k="' + r._k + '"' + (sel.has(r._k) ? ' checked' : '') + ' aria-label="선택"></td>' : '') +
        '<td class="num">' + (view.length - ((page - 1) * ps + i)) + '</td>' + cfg.cols.map(c => cell(c, r)).join('') + '</tr>').join('')
        : '<tr class="empty"><td colspan="' + ncol + '">' + esc(cfg.empty || '조건에 맞는 자료가 없습니다. 검색 조건을 바꾸거나 초기화하세요.') + '</td></tr>';
      let ph = '<button aria-label="이전 쪽"' + (page === 1 ? ' disabled' : '') + ' data-p="' + (page - 1) + '">‹</button>';
      for (let p = 1; p <= pages; p++) ph += '<button data-p="' + p + '"' + (p === page ? ' class="on" aria-current="page"' : '') + '>' + p + '</button>';
      ph += '<button aria-label="다음 쪽"' + (page === pages ? ' disabled' : '') + ' data-p="' + (page + 1) + '">›</button>';
      pager.innerHTML = ph;
      if (chkAll) chkAll.checked = slice.length > 0 && slice.every(r => sel.has(r._k));
      if (cfg.onRender) cfg.onRender(api);
    }

    function openDetail(r) {
      const dc = cfg.detail || {};
      const fields = dc.fields || cfg.cols.map(c => ({ key: c.key, label: c.label, render: c.render, st: c.st }));
      const meta = '<table class="meta">' + fields.map(f => '<tr><th>' + esc(f.label) + '</th><td>' + (f.render ? f.render(r) : f.st ? st(r[f.key]) : esc(r[f.key])) + '</td></tr>').join('') + '</table>';
      const body = meta + (dc.body ? '<div class="detail-body">' + esc(dc.body(r)) + '</div>' : '') + (dc.extra ? dc.extra(r) : '');
      const b = (dc.buttons ? dc.buttons(r, api) : []).concat([{ t: '닫기' }]);
      modal({ title: dc.title ? dc.title(r) : '상세 보기', width: dc.width || 720, body: body, buttons: b });
    }

    function openAdd(init) {
      const a = cfg.add;
      const fm = form(a.fields, init);
      modal({
        title: a.title || '등록', width: a.width || 640, body: fm.el,
        buttons: [{ t: '취소' }, {
          t: '저장', cls: 'pri', fn: () => {
            const v = fm.read(); if (!v) return false;
            const r = a.make ? a.make(v) : v;
            r._k = ++seq; rows.unshift(r); sel.clear(); apply();
            toast(a.done || '등록했습니다.');
          }
        }]
      });
    }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-b]');
      if (b) {
        const k = b.dataset.b;
        if (k === 'q') apply();
        else if (k === 'reset') { (cfg.filters || []).forEach(f => { d.getElementById(f._id).value = ''; }); apply(); }
        else if (k === 'add') openAdd();
        else if (k === 'del') {
          if (!sel.size) { toast('삭제할 항목을 먼저 선택하세요.'); return; }
          confirmBox('선택한 ' + sel.size + '건을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.', () => {
            rows = rows.filter(r => !sel.has(r._k)); const n = sel.size; sel.clear(); apply(); toast(n + '건을 삭제했습니다.');
          });
        } else if (k === 'excel') excel(cfg.excelName || d.title, cfg.cols.filter(c => !c.noExcel), view);
        else if (k[0] === 'c') cfg.buttons[+k.slice(1)].fn(api);
        return;
      }
      const o = e.target.closest('[data-open]');
      if (o) { const r = rows.find(x => x._k === +o.dataset.open); if (r) (cfg.onOpen || openDetail)(r, api); return; }
      const p = e.target.closest('[data-p]');
      if (p && !p.disabled) { page = +p.dataset.p; render(); }
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t === chkAll) { view.slice((page - 1) * ps, page * ps).forEach(r => t.checked ? sel.add(r._k) : sel.delete(r._k)); render(); }
      else if (t.dataset.k) { const k = +t.dataset.k; t.checked ? sel.add(k) : sel.delete(k); t.closest('tr').classList.toggle('sel', t.checked); }
    });
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id.startsWith('q')) apply(); });

    const api = {
      get rows() { return rows; },
      get view() { return view; },
      refresh: render,
      update(r) { render(); return r; },
      remove(r) { rows = rows.filter(x => x !== r); apply(); },
      add(r) { r._k = ++seq; rows.unshift(r); apply(); },
      openDetail: openDetail,
      openAdd: openAdd
    };
    render();
    return api;
  }

  /* 엑셀 (SheetJS 가 있으면 xlsx, 없으면 csv) */
  function excel(name, cols, rows) {
    const head = cols.map(c => c.label);
    const data = rows.map(r => cols.map(c => c.text ? c.text(r) : (r[c.key] == null ? '' : r[c.key])));
    const fn = String(name).replace(/[\\/:*?"<>|]/g, '') + '_' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (w.XLSX) {
      const ws = XLSX.utils.aoa_to_sheet([head].concat(data));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '목록');
      XLSX.writeFile(wb, fn + '.xlsx');
    } else {
      const csv = [head].concat(data).map(a => a.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      const a = d.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = fn + '.csv'; a.click();
    }
    toast(rows.length + '건을 엑셀로 내려받았습니다.');
  }

  /* 개선 포인트: [{sel, t, s}] 대상 요소 왼쪽 위에 번호, 오른쪽 아래에 설명 목록 */
  let points = [];
  const PKEY = 'cpprms-points';
  function ptOn() { try { return localStorage.getItem(PKEY) === '1'; } catch (e) { return false; } }
  function ptSet(v) { try { localStorage.setItem(PKEY, v ? '1' : '0'); } catch (e) { /* 저장 불가 시 무시 */ } }
  function ptRender() {
    qa('.ptm').forEach(e => e.remove()); qa('.pt-box').forEach(e => e.classList.remove('pt-box'));
    let p = d.getElementById('ptPanel');
    const on = ptOn() && points.length;
    const tg = d.getElementById('ptToggle'); if (tg) tg.setAttribute('aria-pressed', ptOn() ? 'true' : 'false');
    if (!on) { if (p) p.classList.remove('on'); return; }
    if (!p) {
      p = d.createElement('aside'); p.id = 'ptPanel'; p.className = 'ptp'; p.setAttribute('aria-label', '개선 포인트');
      d.body.appendChild(p);
    }
    p.innerHTML = '<h2>개선 포인트 (' + points.length + ')<button type="button" id="ptClose">닫기</button></h2><ol>' + points.map(x => '<li><b>' + esc(x.t) + '</b>' + (x.s ? '<span>' + esc(x.s) + '</span>' : '') + '</li>').join('') + '</ol>';
    p.classList.add('on');
    d.getElementById('ptClose').onclick = () => { ptSet(false); ptRender(); };
    points.forEach((x, i) => {
      const el = x.sel && q(x.sel);
      if (!el || !el.offsetParent) return;
      el.classList.add('pt-box');
      const r = el.getBoundingClientRect();
      const m = d.createElement('span'); m.className = 'ptm'; m.textContent = i + 1;
      m.style.left = (r.left + w.scrollX - 11) + 'px'; m.style.top = (r.top + w.scrollY - 11) + 'px';
      d.body.appendChild(m);
    });
  }
  function setPoints(list) { points = list || []; ptRender(); }

  /* 상단 메뉴 동작 */
  function initGnb() {
    const tg = d.getElementById('ptToggle');
    if (tg) tg.onclick = () => { ptSet(!ptOn()); ptRender(); if (ptOn() && !points.length) toast('이 화면은 따로 표시한 개선 포인트가 없습니다.'); };
    const sb = d.getElementById('gSearch');
    if (sb) sb.onclick = () => {
      const links = qa('.gm .d2 a').map(a => ({ n: a.textContent, h: a.getAttribute('href'), g: a.closest('li').querySelector('.d1').textContent }));
      const box = d.createElement('div'); box.className = 'msr';
      box.innerHTML = '<input placeholder="메뉴 이름 입력 (예: 승하차, 공지)" aria-label="메뉴 이름"><ul></ul>';
      const inp = q('input', box), ul = q('ul', box);
      const draw = () => { const v = inp.value.trim(); ul.innerHTML = links.filter(l => !v || l.n.includes(v) || l.g.includes(v)).map(l => '<li><a href="' + esc(l.h) + '">' + esc(l.n) + '<span>' + esc(l.g) + '</span></a></li>').join('') || '<li style="padding:10px;color:var(--gray)">일치하는 메뉴가 없습니다.</li>'; };
      inp.oninput = draw; draw();
      inp.onkeydown = e => { if (e.key === 'Enter') { const a = q('a', ul); if (a) location.href = a.href; } };
      modal({ title: '메뉴 검색', width: 520, body: box, buttons: [] });
    };
    const nb = d.getElementById('gNoty');
    if (nb) nb.onclick = e => {
      e.stopPropagation();
      let n = d.getElementById('notyBox');
      if (!n) {
        n = d.createElement('div'); n.id = 'notyBox'; n.className = 'noty';
        n.innerHTML = '<h2>알림</h2><ul>' +
          '<li>신분당선(정자~광교) 2026년 10월 승하차 자료가 등록되었습니다.<small>예시, 오늘 09:12</small></li>' +
          '<li>사업일정 "3분기 운영실적 보고" 마감이 3일 남았습니다.<small>예시, 어제 17:40</small></li>' +
          '<li>대외자료 반출 승인 요청 1건이 있습니다.<small>예시, 11월 1일</small></li></ul>';
        d.body.appendChild(n);
        d.addEventListener('click', ev => { if (!n.contains(ev.target)) n.classList.remove('on'); });
      }
      n.classList.toggle('on');
    };
    let rt; const later = () => { clearTimeout(rt); rt = setTimeout(() => { if (ptOn() && points.length) ptRender(); }, 150); };
    w.addEventListener('resize', later);
    /* 자료를 늦게 불러오는 화면: 본문 높이가 바뀌면 번호 위치 다시 계산 */
    if (w.ResizeObserver) new ResizeObserver(later).observe(d.body);
  }

  /* 탭 */
  function tabs(btnSel, onChange) {
    const bs = qa(btnSel);
    bs.forEach(b => b.addEventListener('click', () => {
      bs.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      onChange(b.dataset.tab); ptRender();
    }));
  }

  w.UI = { q, qa, esc, num, toast, st, modal, confirm: confirmBox, form, list, excel, points: setPoints, refreshPoints: ptRender, tabs };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', () => { initGnb(); ptRender(); }); else { initGnb(); ptRender(); }
})(window);
