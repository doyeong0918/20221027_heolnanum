/* 로그인 폼: 이메일/비밀번호 → Supabase 로그인 → 홈으로 이동 */
var loginForm = document.getElementById("login-form");
var loginEmail = document.getElementById("lg-email");
var loginPw = document.getElementById("lg-pw");
var loginBtn = document.getElementById("lg-submit");
var loginMsg = document.getElementById("lg-msg");

function setLoginMsg(text, ok) {
  loginMsg.className = "form-msg" + (ok ? "" : " error");
  loginMsg.textContent = text;
}

/* 로그인 뒤 돌아갈 곳: ?next=write.html 처럼 같은 사이트의 .html 페이지만 허용 (다른 사이트 주소는 무시하고 홈으로) */
function nextPage() {
  var next = new URLSearchParams(location.search).get("next") || "";
  return /^[A-Za-z0-9_-]+\.html(\?[A-Za-z0-9_=&.%-]*)?$/.test(next) ? next : "index.html";
}

var loginUnavailable = authUnavailableMessage();
if (loginUnavailable) {
  setLoginMsg(loginUnavailable);
  loginBtn.disabled = true;
} else {
  /* 이미 로그인돼 있으면(이메일 인증 링크를 타고 돌아온 경우 포함) 바로 홈으로 */
  hnClient.auth.getSession().then(function (res) {
    if (!res.data.session) return;
    setLoginMsg("이미 로그인되어 있어요. 이동할게요.", true);
    location.replace(nextPage());
  });
}

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!hnClient) return;
  var email = loginEmail.value.trim();
  var pw = loginPw.value;
  if (!email || !loginEmail.checkValidity()) { setLoginMsg("올바른 이메일을 입력해 주세요."); loginEmail.focus(); return; }
  if (!pw) { setLoginMsg("비밀번호를 입력해 주세요."); loginPw.focus(); return; }

  loginBtn.disabled = true;
  setLoginMsg("로그인 중…", true);
  hnClient.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
    if (res.error) {
      loginBtn.disabled = false;
      setLoginMsg(authErrorText(res.error));
      return;
    }
    location.href = nextPage();
  }).catch(function (err) {
    loginBtn.disabled = false;
    setLoginMsg(authErrorText(err));
  });
});
