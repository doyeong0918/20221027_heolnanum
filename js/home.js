/* 홈: 슬라이드 배너, 나눔 수치, 긴급 요청, 혈액 보유 대시보드, 새소식 */
(function () {
  /* ── 슬라이드 배너: 자동 넘김(6초) + 이전/다음/멈춤. 움직임 줄이기 설정이면 자동 넘김 없이 시작 ── */
  var slides = document.querySelectorAll(".slide");
  var countEl = document.getElementById("slide-count");
  var pauseBtn = document.getElementById("slide-pause");
  var current = 0;
  var timer = null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var playing = !reduce;

  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, idx) {
      s.classList.toggle("is-active", idx === current);
      s.setAttribute("aria-hidden", String(idx !== current));
    });
    countEl.innerHTML = "<b>" + pad2(current + 1) + "</b> / " + pad2(slides.length);
  }
  function stop() { clearInterval(timer); timer = null; }
  function start() { stop(); if (playing) timer = setInterval(function () { show(current + 1); }, 6000); }
  function updatePauseBtn() {
    pauseBtn.textContent = playing ? "❚❚" : "▶";
    pauseBtn.setAttribute("aria-label", playing ? "배너 자동 넘김 멈춤" : "배너 자동 넘김 재생");
  }

  document.getElementById("slide-prev").addEventListener("click", function () { show(current - 1); start(); });
  document.getElementById("slide-next").addEventListener("click", function () { show(current + 1); start(); });
  pauseBtn.addEventListener("click", function () { playing = !playing; updatePauseBtn(); start(); });
  show(0);
  updatePauseBtn();
  start();

  /* ── 나눔 수치 / 긴급 요청 (로그인했다면 내 기부 약속까지 합산 — 기부 매칭 페이지와 같은 기준) ── */
  function renderShare(pledges) {
    var open = 0, done = 0, got = 0;
    REQUESTS_SEED.forEach(function (r) {
      var g = gotOf(r, pledges);
      got += g;
      if (g >= r.need) done++; else open++;
    });
    document.getElementById("hs-open").textContent = open;
    document.getElementById("hs-got").textContent = got;
    document.getElementById("hs-done").textContent = done;

    var urgent = REQUESTS_SEED.filter(function (r) { return r.urgency === "high" && gotOf(r, pledges) < r.need; })
      .sort(function (a, b) { return (a.need - gotOf(a, pledges)) - (b.need - gotOf(b, pledges)); })
      .slice(0, 3);
    document.getElementById("urgent-list").innerHTML = urgent.length
      ? urgent.map(function (r) { return requestCardHtml(r, pledges, "link"); }).join("")
      : '<div class="empty" style="grid-column:1/-1">지금은 긴급 요청이 없어요.</div>';
  }
  renderShare([]);
  currentUser().then(function (user) {
    return user ? dbListPledges() : null;
  }).then(function (rows) {
    if (rows) renderShare(rows);
  }).catch(function () { /* 불러오지 못하면 기본 수치를 그대로 둔다 */ });
  document.addEventListener("hn:signout", function () { renderShare([]); });

  /* ── 혈액 보유 / 새소식 ── */
  renderStockDash(document.getElementById("stock-dash"));
  document.getElementById("notice-list").innerHTML = NOTICES.map(function (n) {
    return '<li><span class="tag">' + escapeHtml(n.tag) + '</span><span class="title">' + escapeHtml(n.title) +
      '</span><span class="date">' + escapeHtml(n.date) + "</span></li>";
  }).join("");
})();
