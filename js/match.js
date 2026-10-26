/* 헌혈증 기부 매칭: 예시 요청 목록 + 필터/정렬 + 기부 약속 + 도움 요청 접수
   (기부 약속·도움 요청은 로그인한 계정의 DB에 저장 → db.js. 요청 목록 보기는 로그인 없이도 가능) */
var pledges = [];
var myRequests = [];
var signedIn = false;

var listEl = document.getElementById("request-list");
var pledgeListEl = document.getElementById("pledge-list");
var myReqListEl = document.getElementById("myreq-list");
var msgEl = document.getElementById("match-msg");
var reqGateEl = document.getElementById("req-gate");
var reqForm = document.getElementById("req-form");
var filterRegion = document.getElementById("filter-region");
var filterUrgency = document.getElementById("filter-urgency");
var filterSort = document.getElementById("filter-sort");

var dialog = document.getElementById("donate-dialog");
var donateForm = document.getElementById("donate-form");
var donateTarget = document.getElementById("donate-target");
var donateError = document.getElementById("df-error");
var donateCount = document.getElementById("df-count");
var donateNick = document.getElementById("df-nick");
var donateMsg = document.getElementById("df-msg");
var donateBtn = donateForm.querySelector('button[type="submit"]');
var currentRequestId = null;

var LOGIN_LINK = '<a href="' + loginHref() + '">로그인</a>';
var LOADING_LI = '<li class="empty" style="display:block">불러오는 중…</li>';

/* 지역 select 채우기 */
var rfRegion = document.getElementById("rf-region");
REGIONS.forEach(function (r) {
  filterRegion.insertAdjacentHTML("beforeend", '<option value="' + r + '">' + r + "</option>");
  rfRegion.insertAdjacentHTML("beforeend", '<option value="' + r + '">' + r + "</option>");
});

function renderRequests() {
  var region = filterRegion.value;
  var urgency = filterUrgency.value;
  var sort = filterSort.value;

  var rows = REQUESTS_SEED.filter(function (r) {
    return (!region || r.region === region) && (!urgency || r.urgency === urgency);
  });
  rows.sort(function (a, b) {
    if (sort === "recent") return b.posted.localeCompare(a.posted);
    if (sort === "remain") return (a.need - gotOf(a, pledges)) - (b.need - gotOf(b, pledges));
    var ua = a.urgency === "high" ? 0 : 1, ub = b.urgency === "high" ? 0 : 1;
    return ua - ub || b.posted.localeCompare(a.posted);
  });

  listEl.innerHTML = rows.length
    ? rows.map(function (r) { return requestCardHtml(r, pledges, "donate"); }).join("")
    : '<div class="empty" style="grid-column:1/-1">조건에 맞는 요청이 없어요.</div>';
}

function renderPledges() {
  if (!pledges.length) {
    pledgeListEl.innerHTML = '<li class="empty" style="display:block">' +
      (signedIn ? "아직 기부 약속이 없어요. 위 목록에서 기부해 보세요." : "로그인하면 내 기부 약속을 볼 수 있어요. " + LOGIN_LINK) + "</li>";
    return;
  }
  pledgeListEl.innerHTML = pledges.slice().reverse().map(function (p) {
    var req = findRequest(p.reqId);
    return '<li><div class="grow"><strong>' + escapeHtml(req ? req.alias : "요청") + "</strong> · " + p.count + "장" +
      '<div class="sub">' + escapeHtml(p.nick) + (p.msg ? " — " + escapeHtml(p.msg) : "") + " · " + escapeHtml(p.at) + "</div></div>" +
      '<button type="button" class="btn btn-outline btn-small" data-cancel="' + p.id + '">약속 취소</button></li>';
  }).join("");
}

function renderMyRequests() {
  if (!myRequests.length) {
    myReqListEl.innerHTML = '<li class="empty" style="display:block">' +
      (signedIn ? "접수한 요청이 없어요." : "로그인하면 내가 접수한 요청을 볼 수 있어요. " + LOGIN_LINK) + "</li>";
    return;
  }
  myReqListEl.innerHTML = myRequests.slice().reverse().map(function (r) {
    return '<li><div class="grow"><strong>' + escapeHtml(r.alias) + "</strong> · " + escapeHtml(r.region) + " · " +
      escapeHtml(r.reason) + " · " + r.need + "장" +
      '<div class="sub">' + escapeHtml(r.at) + " 접수" + (r.story ? " — " + escapeHtml(r.story) : "") + "</div></div>" +
      '<span class="badge badge-wait">검수 대기</span>' +
      '<button type="button" class="btn btn-outline btn-small" data-delreq="' + r.id + '">삭제</button></li>';
  }).join("");
}

function renderMine() {
  renderRequests();
  renderPledges();
  renderMyRequests();
}

function showMsg(text) {
  msgEl.className = "form-msg";
  msgEl.textContent = text;
}

function setRequestFormEnabled(on) {
  reqForm.querySelectorAll("input, select, textarea, button").forEach(function (el) { el.disabled = !on; });
}

/* 로그인 상태를 확인하고 내 기부 약속·도움 요청을 DB에서 불러온다 (로그아웃하면 다시 호출해 비움) */
function loadMine() {
  pledges = [];
  myRequests = [];
  signedIn = false;
  reqGateEl.innerHTML = "";
  setRequestFormEnabled(false);
  renderRequests();

  var unavailable = authUnavailableMessage();
  if (unavailable) {
    reqGateEl.innerHTML = noticeHtml(unavailable);
    renderMine();
    return;
  }
  pledgeListEl.innerHTML = LOADING_LI;
  myReqListEl.innerHTML = LOADING_LI;
  currentUser().then(function (user) {
    if (!user) {
      reqGateEl.innerHTML = loginNoticeHtml("도움 요청을 남기려면");
      return;
    }
    return Promise.all([dbListPledges(), dbListMyRequests()]).then(function (res) {
      pledges = res[0];
      myRequests = res[1];
      signedIn = true;
      setRequestFormEnabled(true);
    });
  }).catch(function (err) {
    reqGateEl.innerHTML = noticeHtml(dbErrorText(err));
  }).then(renderMine);
}

/* ── 이벤트 ── */
[filterRegion, filterUrgency, filterSort].forEach(function (el) {
  el.addEventListener("change", renderRequests);
});

listEl.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-donate]");
  if (!btn) return;
  if (!signedIn) {
    var unavailable = authUnavailableMessage();
    msgEl.className = "form-msg error";
    if (unavailable) msgEl.textContent = unavailable;
    else msgEl.innerHTML = "기부 약속을 남기려면 " + LOGIN_LINK + "이 필요해요.";
    showToast("기부하려면 로그인이 필요해요");
    return;
  }
  var req = findRequest(btn.getAttribute("data-donate"));
  var remain = req.need - gotOf(req, pledges);
  currentRequestId = req.id;
  donateTarget.textContent = req.alias + " · " + req.region + " · " + remain + "장 남음";
  donateCount.max = remain;
  donateCount.value = 1;
  donateError.textContent = "";
  dialog.showModal();
});

document.getElementById("donate-cancel").addEventListener("click", function () { dialog.close(); });

donateForm.addEventListener("submit", function (e) {
  e.preventDefault();
  var req = findRequest(currentRequestId);
  var remain = req.need - gotOf(req, pledges);
  var nick = donateNick.value.trim();
  var count = parseInt(donateCount.value, 10);
  if (!nick) { donateError.textContent = "닉네임을 입력해 주세요."; return; }
  if (!(count >= 1) || count > remain) { donateError.textContent = "기부 장수는 1장 이상, " + remain + "장 이하로 입력해 주세요."; return; }

  donateBtn.disabled = true;
  dbAddPledge({ reqId: req.id, nick: nick, count: count, msg: donateMsg.value.trim() }).then(function (p) {
    pledges.push(p);
    dialog.close();
    donateMsg.value = "";
    renderRequests();
    renderPledges();
    showMsg(req.alias + "에게 " + count + "장 기부를 약속했어요. 고마워요!");
  }).catch(function (err) {
    donateError.textContent = dbErrorText(err);
  }).then(function () {
    donateBtn.disabled = false;
  });
});

pledgeListEl.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-cancel]");
  if (!btn) return;
  var id = btn.getAttribute("data-cancel");
  btn.disabled = true;
  dbDeletePledge(id).then(function () {
    pledges = pledges.filter(function (p) { return p.id !== id; });
    renderRequests();
    renderPledges();
  }).catch(function (err) {
    btn.disabled = false;
    showToast(dbErrorText(err));
  });
});

reqForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!signedIn) return;
  var msg = document.getElementById("rf-msg");
  var alias = document.getElementById("rf-alias").value.trim();
  var need = parseInt(document.getElementById("rf-need").value, 10);
  msg.className = "form-msg error";
  if (!alias) { msg.textContent = "표시 이름을 입력해 주세요."; return; }
  if (!(need >= 1 && need <= 100)) { msg.textContent = "필요한 장수는 1~100 사이로 입력해 주세요."; return; }

  var submit = reqForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  dbAddRequest({
    alias: alias, need: need,
    region: rfRegion.value,
    reason: document.getElementById("rf-reason").value,
    story: document.getElementById("rf-story").value.trim()
  }).then(function (r) {
    myRequests.push(r);
    reqForm.reset();
    renderMyRequests();
    msg.className = "form-msg";
    msg.textContent = "요청이 접수됐어요. 검수가 끝나면 목록에 공개돼요.";
  }).catch(function (err) {
    msg.className = "form-msg error";
    msg.textContent = dbErrorText(err);
  }).then(function () {
    submit.disabled = !signedIn;
  });
});

myReqListEl.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-delreq]");
  if (!btn) return;
  var id = btn.getAttribute("data-delreq");
  btn.disabled = true;
  dbDeleteRequest(id).then(function () {
    myRequests = myRequests.filter(function (r) { return r.id !== id; });
    renderMyRequests();
  }).catch(function (err) {
    btn.disabled = false;
    showToast(dbErrorText(err));
  });
});

document.addEventListener("hn:signout", loadMine);
loadMine();
