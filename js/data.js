/* 여러 페이지가 함께 쓰는 예시 데이터와 부품 (common.js 다음에 로드)
   → 실제 데이터(서버·공공 API)가 생기면 이 파일의 값만 교체하면 됨 */
var MYTYPE_KEY = "hn_mytype";

/* 화면 구성용 예시 데이터 — 실제 사람·병원이 아님 */
var REQUESTS_SEED = [
  { id: "s1", alias: "예시① 40대 가족", region: "서울", reason: "항암·장기 치료", need: 20, got: 12, urgency: "high",   posted: "2026-10-09" },
  { id: "s2", alias: "예시② 30대 직장인", region: "경기", reason: "수술",            need: 8,  got: 3,  urgency: "normal", posted: "2026-10-07" },
  { id: "s3", alias: "예시③ 60대 어르신 가족", region: "부산", reason: "수술",       need: 10, got: 9,  urgency: "high",   posted: "2026-10-04" },
  { id: "s4", alias: "예시④ 20대 대학생", region: "대전", reason: "응급·사고",       need: 6,  got: 1,  urgency: "high",   posted: "2026-10-10" },
  { id: "s5", alias: "예시⑤ 50대 가장",  region: "경기", reason: "항암·장기 치료",   need: 15, got: 15, urgency: "normal", posted: "2026-09-28" },
  { id: "s6", alias: "예시⑥ 10대 학생 가족", region: "광주", reason: "기타",        need: 5,  got: 0,  urgency: "normal", posted: "2026-10-11" }
];

var NOTICES = [
  { tag: "안내", title: "헌혈나눔 베타 서비스를 시작했어요", date: "2026-10-12" },
  { tag: "안내", title: "헌혈증 기부 전 꼭 확인할 5가지를 정리했어요", date: "2026-10-10" },
  { tag: "캠페인", title: "10월 부족 혈액형 헌혈 캠페인 안내", date: "2026-10-08" }
];

var STOCK = [
  { type: "A",  days: 4.8 },
  { type: "B",  days: 3.4 },
  { type: "O",  days: 2.6 },
  { type: "AB", days: 5.9 }
];
var GAUGE_MAX_DAYS = 7;

/* 이 사이트 자체 기준 (공식 단계 기준이 아님) */
function levelOf(days) {
  if (days >= 5) return { n: 1, label: "여유" };
  if (days >= 3) return { n: 2, label: "보통" };
  if (days >= 2) return { n: 3, label: "부족" };
  return { n: 4, label: "긴급" };
}

/* ── 기부 요청 ── */
function pledgedFor(pledges, id) {
  return pledges.filter(function (p) { return p.reqId === id; })
    .reduce(function (sum, p) { return sum + p.count; }, 0);
}
function gotOf(req, pledges) { return Math.min(req.need, req.got + pledgedFor(pledges, req.id)); }
function findRequest(id) {
  return REQUESTS_SEED.filter(function (r) { return r.id === id; })[0];
}

/* mode: "donate" = 기부 버튼(매칭 페이지), "link" = 매칭 페이지로 가는 링크(홈) */
function requestCardHtml(req, pledges, mode) {
  var got = gotOf(req, pledges);
  var remain = req.need - got;
  var pct = Math.round((got / req.need) * 100);
  var urgent = req.urgency === "high" ? '<span class="badge badge-urgent">긴급</span>' : '<span class="badge">일반</span>';
  var action;
  if (remain <= 0) action = '<button type="button" class="btn" disabled>목표 달성 🎉</button>';
  else if (mode === "link") action = '<a class="btn btn-outline" href="match.html#requests">자세히 보고 기부하기</a>';
  else action = '<button type="button" class="btn" data-donate="' + req.id + '">헌혈증 기부하기</button>';
  return '<article class="req-card">' +
    '<div class="req-top">' + urgent + '<span class="badge">' + escapeHtml(req.region) + '</span>' +
    '<span class="req-date">' + escapeHtml(req.posted) + "</span></div>" +
    '<div class="req-title">' + escapeHtml(req.alias) + "</div>" +
    '<p class="req-desc">사유: ' + escapeHtml(req.reason) + "</p>" +
    '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + req.need + '" aria-valuenow="' + got + '">' +
    '<div class="progress-bar" style="width:' + pct + '%"></div></div>' +
    '<div class="progress-text"><span>' + got + " / " + req.need + "장</span><span>" +
    (remain > 0 ? remain + "장 남음" : "완료") + "</span></div>" + action + "</article>";
}

/* ── 혈액 보유 대시보드: 도넛(전체 평균) + 혈액형별 막대 ── */
function renderStockDash(el) {
  var mine = loadJson(MYTYPE_KEY, "");
  var avg = STOCK.reduce(function (s, x) { return s + x.days; }, 0) / STOCK.length;
  var avgLv = levelOf(avg);
  var C = 2 * Math.PI * 42;
  var arc = Math.min(1, avg / GAUGE_MAX_DAYS) * C;

  var donut = '<div class="donut-wrap"><svg class="donut" viewBox="0 0 100 100" role="img" aria-label="전체 평균 ' + avg.toFixed(1) + '일분, ' + avgLv.label + '">' +
    '<circle class="donut-bg" cx="50" cy="50" r="42"></circle>' +
    '<circle class="donut-fg s-' + avgLv.n + '" cx="50" cy="50" r="42" stroke-dasharray="' + arc.toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 50 50)"></circle>' +
    '<text class="donut-num" x="50" y="52" text-anchor="middle">' + avg.toFixed(1) + '</text>' +
    '<text class="donut-unit" x="50" y="64" text-anchor="middle">DAY</text></svg>' +
    '<div class="donut-caption">전체 평균 <strong>' + avg.toFixed(1) + '일분</strong> <span class="lv-pill lv-' + avgLv.n + '">' + avgLv.label + "</span></div></div>";

  var bars = '<div class="vbars">' + STOCK.map(function (s) {
    var lv = levelOf(s.days);
    var pct = Math.min(100, Math.round((s.days / GAUGE_MAX_DAYS) * 100));
    return '<div class="vbar' + (s.type === mine ? " mine" : "") + '">' +
      '<div class="vbar-track" role="img" aria-label="' + s.type + "형 " + lv.label + " " + s.days.toFixed(1) + '일분">' +
      '<div class="vbar-fill lv-' + lv.n + '" style="height:' + pct + '%"></div></div>' +
      '<div class="vbar-type">' + s.type + '</div><div class="vbar-days">' + s.days.toFixed(1) + '일분</div>' +
      '<span class="lv-pill lv-' + lv.n + '">' + lv.label + "</span></div>";
  }).join("") + "</div>";

  el.innerHTML = donut + bars;
}
