/* 게시판 목록: 분류 탭 + 검색 + 페이지 나누기 — 조건은 주소(?cat=&q=&page=)에 담아 링크로 이동한다 (db.js) */
var PAGE_SIZE = 10;

var boardParams = new URLSearchParams(location.search);
var boardCat = boardParams.get("cat") || "";
if (!categoryLabel(boardCat)) boardCat = "";
var boardQ = (boardParams.get("q") || "").trim().slice(0, 40);
var boardPage = Math.max(1, parseInt(boardParams.get("page"), 10) || 1);

var catsEl = document.getElementById("board-cats");
var listEl = document.getElementById("board-list");
var pagerEl = document.getElementById("board-pager");
var countEl = document.getElementById("board-count");

function boardUrl(cat, q, page) {
  var parts = [];
  if (cat) parts.push("cat=" + encodeURIComponent(cat));
  if (q) parts.push("q=" + encodeURIComponent(q));
  if (page > 1) parts.push("page=" + page);
  return "board.html" + (parts.length ? "?" + parts.join("&") : "");
}

function renderCats() {
  catsEl.innerHTML = [["", "전체"]].concat(POST_CATEGORIES).map(function (c) {
    var on = c[0] === boardCat;
    return '<a class="chip' + (on ? " on" : "") + '" href="' + escapeHtml(boardUrl(c[0], boardQ, 1)) + '"' +
      (on ? ' aria-current="true"' : "") + ">" + c[1] + "</a>";
  }).join("");
}

function renderPager(total) {
  var pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) { pagerEl.innerHTML = ""; return; }
  var link = function (label, n) { return '<a href="' + escapeHtml(boardUrl(boardCat, boardQ, n)) + '">' + label + "</a>"; };
  var end = Math.min(pages, Math.max(1, boardPage - 2) + 4);
  var start = Math.max(1, end - 4);
  var html = boardPage > 1 ? link("이전", boardPage - 1) : '<span class="off">이전</span>';
  for (var i = start; i <= end; i++) {
    html += i === boardPage ? '<span class="cur" aria-current="page">' + i + "</span>" : link(i, i);
  }
  html += boardPage < pages ? link("다음", boardPage + 1) : '<span class="off">다음</span>';
  pagerEl.innerHTML = html;
}

function renderRows(posts) {
  if (!posts.length) {
    listEl.innerHTML = '<li class="empty">' +
      (boardQ || boardCat ? "조건에 맞는 글이 없어요." : "아직 글이 없어요. 첫 글을 남겨 보세요.") + "</li>";
    return;
  }
  listEl.innerHTML = posts.map(function (p) {
    return '<li class="board-row"><a class="board-title" href="post.html?id=' + encodeURIComponent(p.id) + '">' +
      '<span class="badge">' + escapeHtml(categoryLabel(p.category)) + '</span><span class="t">' + escapeHtml(p.title) + "</span></a>" +
      '<span class="board-meta">' + escapeHtml(p.author) + " · " + toDateStr(new Date(p.createdAt)) + "</span></li>";
  }).join("");
}

function loadBoard() {
  renderCats();
  document.getElementById("bs-q").value = boardQ;
  var catInput = document.getElementById("bs-cat");
  catInput.value = boardCat;
  catInput.disabled = !boardCat;   /* 전체 보기일 땐 주소에 cat 을 붙이지 않는다 */

  var unavailable = authUnavailableMessage();
  if (unavailable) {
    countEl.innerHTML = noticeHtml(unavailable);
    return;
  }
  listEl.innerHTML = '<li class="empty">불러오는 중…</li>';
  dbListPosts({ category: boardCat, q: boardQ, page: boardPage, size: PAGE_SIZE }).then(function (res) {
    countEl.textContent = (boardQ ? "‘" + boardQ + "’ 검색 결과 " : "") + "총 " + res.total + "개의 글";
    renderRows(res.posts);
    renderPager(res.total);
  }).catch(function (err) {
    if (err && err.code === "PGRST103") { location.replace(boardUrl(boardCat, boardQ, 1)); return; }   /* 없는 페이지 번호 */
    listEl.innerHTML = "";
    countEl.innerHTML = noticeHtml(dbErrorText(err));
  });
}

loadBoard();
