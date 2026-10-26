/* 내 헌혈: 기록 추가/삭제, 다음 가능일 계산, 캘린더(.ics) 내보내기 (기록은 로그인한 계정의 DB에 저장 → db.js) */
var DONATION_TYPES = {
  whole:    { label: "전혈" },
  plasma:   { label: "혈장성분" },
  platelet: { label: "혈소판성분" }
};
/* 계산 그룹: 같은 그룹 안에서 마지막 헌혈일 + 간격(일) */
var GROUPS = [
  { id: "whole",     label: "전혈",              types: ["whole"],              gap: 56 },
  { id: "apheresis", label: "성분헌혈 (혈장·혈소판)", types: ["plasma", "platelet"], gap: 14 }
];

var records = [];
var signedIn = false;

var nextGrid = document.getElementById("next-grid");
var listEl = document.getElementById("record-list");
var form = document.getElementById("record-form");
var dateInput = document.getElementById("rec-date");
var msgEl = document.getElementById("rec-msg");
var gateEl = document.getElementById("auth-gate");
var submitBtn = form.querySelector('button[type="submit"]');

dateInput.value = toDateStr(today());
dateInput.max = toDateStr(today());

function setFormEnabled(on) {
  form.querySelectorAll("input, select, button").forEach(function (el) { el.disabled = !on; });
}

function lastDateOf(group) {
  var dates = records.filter(function (r) { return group.types.indexOf(r.type) !== -1; })
    .map(function (r) { return r.date; }).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function renderNext() {
  nextGrid.innerHTML = GROUPS.map(function (g) {
    var last = lastDateOf(g);
    if (!last) {
      return '<div class="card next-card"><div class="next-label">' + g.label + " (" + (g.gap / 7 >= 2 && g.gap % 7 === 0 ? g.gap / 7 + "주" : g.gap + "일") + ' 간격)</div>' +
        '<div class="next-date">기록 없음</div><div class="next-dday">' +
        (signedIn ? "아래에서 헌혈 기록을 추가해 보세요." : "로그인하면 헌혈 기록을 남길 수 있어요.") + "</div></div>";
    }
    var next = addDays(parseDate(last), g.gap);
    var diff = daysBetween(today(), next);
    var ready = diff <= 0;
    return '<div class="card next-card"><div class="next-label">' + g.label + " 다음 가능일</div>" +
      '<div class="next-date">' + toDateStr(next) + "</div>" +
      '<div class="next-dday' + (ready ? " ready" : "") + '">' + (ready ? "✅ 지금 헌혈할 수 있어요" : "D-" + diff + " (마지막 헌혈 " + last + ")") + "</div>" +
      '<button type="button" class="btn btn-outline btn-small" data-ics="' + g.id + '">캘린더에 추가(.ics)</button></div>';
  }).join("");
}

function renderStats() {
  var year = String(new Date().getFullYear());
  var dates = records.map(function (r) { return r.date; }).sort();
  document.getElementById("stat-total").textContent = records.length;
  document.getElementById("stat-year").textContent = records.filter(function (r) { return r.date.indexOf(year) === 0; }).length;
  document.getElementById("stat-last").textContent = dates.length ? dates[dates.length - 1].slice(2).replace(/-/g, ".") : "-";
}

function renderList() {
  if (!records.length) {
    listEl.innerHTML = '<li class="empty" style="display:block">' +
      (signedIn ? "아직 기록이 없어요." : '로그인하면 내 헌혈 기록을 볼 수 있어요. <a href="' + loginHref() + '">로그인</a>') + "</li>";
    return;
  }
  var sorted = records.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  listEl.innerHTML = sorted.map(function (r) {
    return '<li><div class="grow"><strong>' + escapeHtml(r.date) + "</strong> · " + DONATION_TYPES[r.type].label +
      (r.place ? '<div class="sub">' + escapeHtml(r.place) + "</div>" : "") + "</div>" +
      '<button type="button" class="btn btn-outline btn-small" data-del="' + r.id + '">삭제</button></li>';
  }).join("");
}

function renderAll() {
  renderNext();
  renderStats();
  renderList();
}

/* 로그인 상태를 확인하고 내 기록을 DB에서 불러온다 (로그아웃하면 다시 호출해 비움) */
function loadRecords() {
  records = [];
  signedIn = false;
  gateEl.innerHTML = "";
  setFormEnabled(false);

  var unavailable = authUnavailableMessage();
  if (unavailable) {
    gateEl.innerHTML = noticeHtml(unavailable);
    renderAll();
    return;
  }
  listEl.innerHTML = '<li class="empty" style="display:block">불러오는 중…</li>';
  currentUser().then(function (user) {
    if (!user) {
      gateEl.innerHTML = loginNoticeHtml("헌혈 기록을 남기고 다음 가능일을 계산하려면");
      return;
    }
    return dbListRecords().then(function (rows) {
      records = rows;
      signedIn = true;
      setFormEnabled(true);
    });
  }).catch(function (err) {
    gateEl.innerHTML = noticeHtml(dbErrorText(err));
  }).then(renderAll);
}

/* 다음 가능일을 하루짜리 종일 일정(.ics)으로 내려받기 */
function downloadIcs(group) {
  var last = lastDateOf(group);
  if (!last) return;
  var next = addDays(parseDate(last), group.gap);
  var day = toDateStr(next).replace(/-/g, "");
  var now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  var ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//heolnanum//KO", "BEGIN:VEVENT",
    "UID:" + newId() + "@heolnanum", "DTSTAMP:" + now,
    "DTSTART;VALUE=DATE:" + day,
    "SUMMARY:헌혈 가능일 (" + group.label + ")",
    "DESCRIPTION:헌혈나눔에서 계산한 다음 헌혈 가능일이에요.",
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "heolhyeol-" + group.id + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!signedIn) return;
  var date = dateInput.value;
  msgEl.className = "form-msg error";
  if (!date) { msgEl.textContent = "헌혈 날짜를 선택해 주세요."; return; }
  if (date > toDateStr(today())) { msgEl.textContent = "미래 날짜는 기록할 수 없어요."; return; }

  submitBtn.disabled = true;
  dbAddRecord({
    date: date,
    type: document.getElementById("rec-type").value,
    place: document.getElementById("rec-place").value.trim()
  }).then(function (rec) {
    records.push(rec);
    document.getElementById("rec-place").value = "";
    renderAll();
    msgEl.className = "form-msg";
    msgEl.textContent = date + " 기록을 추가했어요.";
  }).catch(function (err) {
    msgEl.className = "form-msg error";
    msgEl.textContent = dbErrorText(err);
  }).then(function () {
    submitBtn.disabled = !signedIn;
  });
});

listEl.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-del]");
  if (!btn || !confirm("이 기록을 삭제할까요?")) return;
  var id = btn.getAttribute("data-del");
  btn.disabled = true;
  dbDeleteRecord(id).then(function () {
    records = records.filter(function (r) { return r.id !== id; });
    renderAll();
  }).catch(function (err) {
    btn.disabled = false;
    showToast(dbErrorText(err));
  });
});

nextGrid.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-ics]");
  if (!btn) return;
  downloadIcs(GROUPS.filter(function (g) { return g.id === btn.getAttribute("data-ics"); })[0]);
});

document.addEventListener("hn:signout", loadRecords);
loadRecords();
