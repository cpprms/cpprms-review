/* CPPRMS 화면 공통 예시 자료 (v2.0, 2026-11-03)
   노선, 사업자 이름은 운영평가 관리 화면(운영본) 기준. 사람 이름, 날짜, 수치는 모두 예시 */
window.CP = {
  year: 2026,
  lines: [
    { id: 'sgrail', line: 'GTX-A(운정중앙~서울)', org: '에스지레일', type: 'BTO', rail: '광역철도', period: 30 },
    { id: 'seobu', line: '서해선(대곡~소사)', org: '서부광역철도', type: 'BTL', rail: '일반철도', period: 20 },
    { id: 'erail', line: '서해선(소사~원시)', org: '이레일', type: 'BTL', rail: '일반철도', period: 20 },
    { id: 'gaya', line: '경전선(함안~진주)', org: '가야철도', type: 'BTL', rail: '일반철도', period: 20 },
    { id: 'jeolla', line: '전라선(익산~신리)', org: '전라선철도', type: 'BTL', rail: '일반철도', period: 20 },
    { id: 'saeseoul', line: '신분당선(신사~강남)', org: '새서울철도', type: 'BTO', rail: '광역철도', period: 30 },
    { id: 'gyeonggi', line: '신분당선(정자~광교)', org: '경기철도', type: 'BTO', rail: '광역철도', period: 30 },
    { id: 'shinbundang', line: '신분당선(강남~정자)', org: '신분당선', type: 'BTO', rail: '광역철도', period: 30 },
    { id: 'airport', line: '인천국제공항철도', org: '공항철도', type: 'BTO', rail: '일반철도', period: 34 }
  ],
  /* 업무그룹 (업무자료 관리 왼쪽 목록 기준) */
  groups: ['센터 업무관리', '신분당선 1단계(강남~정자)', '신분당선 2단계(정자~광교)', '신분당선 3단계(신사~강남)', 'GTX-A', 'GTX-B', 'GTX-C', '신안산선', '인천국제공항철도', '경전선(함안~진주)', '전라선(익산~신리)', '대장홍대 광역철도', '부전마산 복선전철', '서해선(대곡~소사)', '서해선(소사~원시)'],
  staff: ['김**', '이**', '박**', '최**', '정**', '강**', '조**', '윤**'], // 이름은 성 + ** 로 가림 (예시)
  /* 운영평가 지표와 배점(환산). BTL 은 운영본 결과조회 화면 캡처 기준(시설물 수준 86, 경영관리 14).
     BTO 는 안전수준 14점만 운영본 화면 기준이고 나머지 배점은 예시 */
  evalDef: {
    BTL: [
      { g: '시설물 수준', items: [{ k: 'safe', n: '안전수준', t: '정량', w: 40 }, { k: 'struct', n: '구조물 유지관리', t: '정량', w: 8 }, { k: 'insp', n: '정기안전점검 이행의 적정성', t: '정성', w: 8 }, { k: 'sys', n: '시스템 유지관리', t: '정량', w: 30 }] },
      { g: '경영관리', items: [{ k: 'mplan', n: '유지관리 시행계획 및 이행의 적정성', t: '정성', w: 14 }] }
    ],
    BTO: [
      { g: '시설물 수준', items: [{ k: 'safe', n: '안전수준', t: '정량', w: 14 }, { k: 'struct', n: '구조물 유지관리', t: '정량', w: 7 }, { k: 'insp', n: '정기안전점검 이행의 적정성', t: '정성', w: 7 }, { k: 'sys', n: '시스템 유지관리', t: '정량', w: 7 }] },
      { g: '서비스 수준', items: [{ k: 'cong', n: '혼잡도', t: '정량', w: 6 }, { k: 'run', n: '열차운행률', t: '정량', w: 6 }, { k: 'ontime', n: '정시율', t: '정량', w: 6 }, { k: 'stn', n: '역사 이용시설', t: '정량', w: 6 }, { k: 'mob', n: '교통약자 이용시설', t: '정량', w: 6 }, { k: 'cmpl', n: '고객민원 응대', t: '정성', w: 5 }, { k: 'csat', n: '고객만족도', t: '정량', w: 6 }, { k: 'svc', n: '서비스 개선노력', t: '정성', w: 4 }] },
      { g: '경영관리', items: [{ k: 'rev', n: '수입증대 개선노력', t: '정성', w: 6 }, { k: 'cost', n: '운영비용 집행적정성', t: '정성', w: 7 }, { k: 'mplan', n: '유지관리 시행계획 및 이행의 적정성', t: '정성', w: 7 }] }
    ]
  },
  evalNote: { BTL: '지표와 배점은 운영본 결과조회 화면 기준', BTO: '안전수준 14점 외 배점은 예시' },
  orgNames() { return this.lines.map(l => l.org); },
  lineNames() { return this.lines.map(l => l.line); },
  pick(arr, i) { return arr[i % arr.length]; },
  /* 날짜 예시: 기준일 2026-11-03 에서 n일 전 */
  day(n, t) {
    const dt = new Date(2026, 10, 3); dt.setDate(dt.getDate() - n);
    const s = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    return t ? s + ' ' + t : s;
  }
};
