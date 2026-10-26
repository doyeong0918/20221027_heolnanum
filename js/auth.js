/* Supabase 인증 공통: 클라이언트 생성 + 에러 문구 + 유틸바의 로그인 상태 표시
   (supabase-js, supabase-config.js, common.js 다음에 로드. 폼 동작은 login.js / signup.js) */
var hnClient = null;

function authConfigured() {
  return SUPABASE_URL.indexOf("YOUR-") === -1 && SUPABASE_ANON_KEY.indexOf("YOUR-") === -1;
}

if (authConfigured() && window.supabase) {
  hnClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* 연결이 안 된 이유를 사람 말로. 정상이면 빈 문자열 */
function authUnavailableMessage() {
  if (hnClient) return "";
  if (!authConfigured()) return "Supabase 연결 정보가 아직 없어요. js/supabase-config.js 에 Project URL 과 anon key 를 넣어 주세요.";
  return "인증 서비스를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.";
}

var AUTH_ERRORS = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않아요.",
  email_not_confirmed: "이메일 인증이 아직이에요. 받은 메일의 인증 링크를 눌러 주세요.",
  user_already_exists: "이미 가입된 이메일이에요. 로그인해 주세요.",
  weak_password: "비밀번호가 너무 쉬워요. 더 길고 복잡하게 만들어 주세요.",
  email_address_invalid: "사용할 수 없는 이메일 주소예요.",
  signup_disabled: "지금은 회원가입을 받지 않아요.",
  over_email_send_rate_limit: "인증 메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.",
  over_request_rate_limit: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."
};
function authErrorText(error) {
  var msg = (error && error.message) || "";
  if (error && AUTH_ERRORS[error.code]) return AUTH_ERRORS[error.code];
  if (/rate limit/i.test(msg)) return AUTH_ERRORS.over_request_rate_limit;
  if (/fetch|network/i.test(msg)) return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
  return "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

/* ── 유틸바: 로그아웃 상태 = 로그인/회원가입 링크, 로그인 상태 = 닉네임 + 로그아웃 ── */
function renderAuthLinks(user) {
  var box = document.getElementById("auth-links");
  if (!box) return;
  if (!user) {
    box.innerHTML = '<a href="login.html">로그인</a><a href="signup.html">회원가입</a>';
    return;
  }
  var name = (user.user_metadata && user.user_metadata.nickname) || (user.email || "").split("@")[0] || "회원";
  box.innerHTML = '<span class="auth-user">' + escapeHtml(name) + '님</span>' +
    '<button type="button" id="logout-btn">로그아웃</button>';
}

function initAuthBar() {
  var box = document.getElementById("auth-links");
  if (!box || !hnClient) return;

  box.addEventListener("click", function (e) {
    if (!e.target.closest("#logout-btn")) return;
    /* local: 이 브라우저만 로그아웃 (기본값 global 은 다른 기기까지 모두 끊음) */
    hnClient.auth.signOut({ scope: "local" }).then(function (res) {
      showToast(res.error ? authErrorText(res.error) : "로그아웃했어요");
    });
  });

  hnClient.auth.getSession().then(function (res) {
    renderAuthLinks(res.data.session && res.data.session.user);
  });
  /* 콜백 안에서 다른 Supabase 호출을 기다리면 멈출 수 있어서, 여기서는 화면만 바꾸고
     로그아웃 소식은 콜백 밖(setTimeout)에서 알린다 → 사용자 데이터를 보여주는 페이지가 비운다 */
  hnClient.auth.onAuthStateChange(function (event, session) {
    renderAuthLinks(session && session.user);
    if (event === "SIGNED_OUT") setTimeout(function () { document.dispatchEvent(new CustomEvent("hn:signout")); }, 0);
  });
}

initAuthBar();
