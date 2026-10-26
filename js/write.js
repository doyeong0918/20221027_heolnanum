/* 글쓰기 / 글 수정(?id=): 로그인한 회원만. 수정은 내가 쓴 글만 (진짜 권한 검사는 DB의 RLS) */
var editId = new URLSearchParams(location.search).get("id") || "";

var writeForm = document.getElementById("write-form");
var gateEl = document.getElementById("write-gate");
var catSel = document.getElementById("wf-cat");
var titleIn = document.getElementById("wf-title");
var contentIn = document.getElementById("wf-content");
var submitBtn = document.getElementById("wf-submit");
var msgEl = document.getElementById("wf-msg");

POST_CATEGORIES.forEach(function (c) {
  catSel.insertAdjacentHTML("beforeend", '<option value="' + c[0] + '">' + c[1] + "</option>");
});
if (editId) {
  document.getElementById("write-heading").textContent = "글 수정";
  document.title = "헌혈나눔 - 글 수정";
  submitBtn.textContent = "수정 완료";
}

function setFormEnabled(on) {
  writeForm.querySelectorAll("input, select, textarea, button").forEach(function (el) { el.disabled = !on; });
}

function initWrite() {
  gateEl.innerHTML = "";
  setFormEnabled(false);
  var unavailable = authUnavailableMessage();
  if (unavailable) { gateEl.innerHTML = noticeHtml(unavailable); return; }

  currentUser().then(function (user) {
    if (!user) {
      gateEl.innerHTML = loginNoticeHtml(editId ? "글을 수정하려면" : "글을 쓰려면");
      return;
    }
    if (!editId) { setFormEnabled(true); return; }
    return dbGetPost(editId).then(function (post) {
      if (!post) { gateEl.innerHTML = noticeHtml("글을 찾을 수 없어요."); return; }
      if (post.userId !== user.id) { gateEl.innerHTML = noticeHtml("내가 쓴 글만 수정할 수 있어요."); return; }
      catSel.value = post.category;
      titleIn.value = post.title;
      contentIn.value = post.content;
      setFormEnabled(true);
    });
  }).catch(function (err) {
    gateEl.innerHTML = noticeHtml(dbErrorText(err));
  });
}

writeForm.addEventListener("submit", function (e) {
  e.preventDefault();
  var title = titleIn.value.trim();
  var content = contentIn.value.trim();
  msgEl.className = "form-msg error";
  if (!title) { msgEl.textContent = "제목을 입력해 주세요."; titleIn.focus(); return; }
  if (title.length > 100) { msgEl.textContent = "제목은 100자 이내로 써 주세요."; titleIn.focus(); return; }
  if (!content) { msgEl.textContent = "내용을 입력해 주세요."; contentIn.focus(); return; }
  if (content.length > 5000) { msgEl.textContent = "내용은 5000자 이내로 써 주세요."; contentIn.focus(); return; }

  var data = { category: catSel.value, title: title, content: content };
  submitBtn.disabled = true;
  msgEl.className = "form-msg";
  msgEl.textContent = "저장 중…";
  (editId ? dbUpdatePost(editId, data) : dbAddPost(data)).then(function (post) {
    location.href = "post.html?id=" + encodeURIComponent(post.id);
  }).catch(function (err) {
    submitBtn.disabled = false;
    msgEl.className = "form-msg error";
    msgEl.textContent = dbErrorText(err);
  });
});

document.addEventListener("hn:signout", initWrite);
initWrite();
