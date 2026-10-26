/* 게시글 보기: 누구나 읽을 수 있고, 글쓴이에게만 수정·삭제 버튼이 보인다 (진짜 권한 검사는 DB의 RLS) */
var postId = new URLSearchParams(location.search).get("id") || "";
var currentPost = null;

var gateEl = document.getElementById("post-gate");
var boxEl = document.getElementById("post-box");
var ownerEl = document.getElementById("post-owner");

var BACK_LINK = '<p style="margin-top:1rem"><a class="btn btn-outline" href="board.html">목록으로</a></p>';

function showProblem(text) {
  gateEl.innerHTML = noticeHtml(text) + BACK_LINK;
}

function renderOwner(user) {
  if (!currentPost || !user || user.id !== currentPost.userId) { ownerEl.innerHTML = ""; return; }
  ownerEl.innerHTML = '<a class="btn btn-outline" href="write.html?id=' + encodeURIComponent(currentPost.id) + '">수정</a>' +
    '<button type="button" class="btn" id="post-delete">삭제</button>';
}

function renderPost(post) {
  currentPost = post;
  document.title = post.title + " - 헌혈나눔";
  document.getElementById("post-cat").textContent = categoryLabel(post.category);
  document.getElementById("post-title").textContent = post.title;
  var edited = new Date(post.updatedAt) - new Date(post.createdAt) > 1000;
  document.getElementById("post-meta").textContent = post.author + " · " + toDateStr(new Date(post.createdAt)) +
    (edited ? " (수정 " + toDateStr(new Date(post.updatedAt)) + ")" : "");
  document.getElementById("post-body").textContent = post.content;   /* textContent: 글 내용의 HTML 은 실행되지 않는다 */
  boxEl.hidden = false;
}

function loadPost() {
  boxEl.hidden = true;
  currentPost = null;
  gateEl.innerHTML = "";
  if (!postId) { showProblem("잘못된 주소예요."); return; }
  var unavailable = authUnavailableMessage();
  if (unavailable) { showProblem(unavailable); return; }

  Promise.all([dbGetPost(postId), currentUser()]).then(function (res) {
    if (!res[0]) { showProblem("글을 찾을 수 없어요. 삭제됐거나 주소가 잘못됐어요."); return; }
    renderPost(res[0]);
    renderOwner(res[1]);
  }).catch(function (err) {
    showProblem(dbErrorText(err));
  });
}

ownerEl.addEventListener("click", function (e) {
  var btn = e.target.closest("#post-delete");
  if (!btn || !confirm("이 글을 삭제할까요? 삭제하면 되돌릴 수 없어요.")) return;
  btn.disabled = true;
  dbDeletePost(currentPost.id).then(function () {
    location.href = "board.html";
  }).catch(function (err) {
    btn.disabled = false;
    showToast(dbErrorText(err));
  });
});

document.addEventListener("hn:signout", function () { renderOwner(null); });
loadPost();
