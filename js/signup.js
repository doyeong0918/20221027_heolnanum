/* 회원가입 폼: 입력 검사 → Supabase 가입 (닉네임·혈액형은 user metadata로 보내고, DB 트리거가 profiles 행을 만든다) */
var signupForm = document.getElementById("signup-form");
var signupEmail = document.getElementById("su-email");
var signupNick = document.getElementById("su-nick");
var signupBlood = document.getElementById("su-blood");
var signupPw = document.getElementById("su-pw");
var signupPw2 = document.getElementById("su-pw2");
var signupBtn = document.getElementById("su-submit");
var signupMsg = document.getElementById("su-msg");

function setSignupMsg(text, ok) {
  signupMsg.className = "form-msg" + (ok ? "" : " error");
  signupMsg.textContent = text;
}

var signupUnavailable = authUnavailableMessage();
if (signupUnavailable) {
  setSignupMsg(signupUnavailable);
  signupBtn.disabled = true;
}

signupForm.addEventListener("submit", function (e) {
  e.preventDefault();
  if (!hnClient) return;
  var email = signupEmail.value.trim();
  var nick = signupNick.value.trim();
  var blood = signupBlood.value;
  var pw = signupPw.value;

  if (!email || !signupEmail.checkValidity()) { setSignupMsg("올바른 이메일을 입력해 주세요."); signupEmail.focus(); return; }
  if (nick.length < 2 || nick.length > 12) { setSignupMsg("닉네임은 2~12자로 입력해 주세요."); signupNick.focus(); return; }
  if (pw.length < 8) { setSignupMsg("비밀번호는 8자 이상이어야 해요."); signupPw.focus(); return; }
  if (pw !== signupPw2.value) { setSignupMsg("비밀번호가 서로 달라요."); signupPw2.focus(); return; }

  var meta = { nickname: nick };
  if (blood) meta.blood_type = blood;

  signupBtn.disabled = true;
  setSignupMsg("가입 중…", true);
  hnClient.auth.signUp({
    email: email,
    password: pw,
    options: { data: meta, emailRedirectTo: new URL("login.html", location.href).href }
  }).then(function (res) {
    if (res.error) {
      signupBtn.disabled = false;
      setSignupMsg(authErrorText(res.error));
      return;
    }
    /* 이메일 인증을 켜 둔 프로젝트는 이미 가입된 이메일이어도 에러 대신 identities 가 빈 사용자를 돌려준다 */
    if (res.data.user && res.data.user.identities && res.data.user.identities.length === 0) {
      signupBtn.disabled = false;
      setSignupMsg(AUTH_ERRORS.user_already_exists);
      return;
    }
    if (res.data.session) {            /* 이메일 인증을 꺼 둔 경우: 가입과 동시에 로그인됨 */
      location.href = "index.html";
      return;
    }
    signupForm.reset();                 /* 이메일 인증이 필요한 경우 */
    setSignupMsg("인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요.", true);
  }).catch(function (err) {
    signupBtn.disabled = false;
    setSignupMsg(authErrorText(err));
  });
});
