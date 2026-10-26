/* 모든 페이지 공통: 유틸바·헤더·메뉴·페이지 히어로·푸터 렌더링 + 저장/날짜 도우미
   → 메뉴를 추가/수정할 땐 NAV_ITEMS 한 곳만 고치면 됨 */
var SITE_NAME = "헌혈나눔";
var SITE_TAGLINE = "헌혈증은 나누고, 헌혈 주기는 챙기고";

var NAV_ITEMS = [
  { id: "home",   href: "index.html",  label: "홈", sub: [["서비스 소개", "#about"], ["이용 방법", "#how"], ["참조링크", "#links"]] },
  { id: "match",  href: "match.html",  label: "기부 매칭", title: "헌혈증 기부 매칭", tagline: "나누고 싶은 마음과 필요한 손길을 이어드려요",
    sub: [["기부 전 확인", "#guide"], ["기부 요청 목록", "#requests"], ["내 기부 약속", "#my-pledges"], ["도움 요청하기", "#request-form"]] },
  { id: "record", href: "record.html", label: "내 헌혈", title: "내 헌혈 관리", tagline: "다음 헌혈 가능일을 계산하고 기록을 모아보세요",
    sub: [["다음 가능일", "#next"], ["기록 추가", "#add"], ["기록 목록", "#history"]] },
  { id: "status", href: "status.html", label: "혈액 현황", title: "혈액 보유 현황", tagline: "부족한 혈액형을 한눈에 확인해요",
    sub: [["혈액형별 보유량", "#stock"], ["공식 현황", "#official"]] },
  { id: "info",   href: "info.html",   label: "헌혈 정보", title: "헌혈 정보", tagline: "헌혈 전에 알아두면 좋은 이야기",
    sub: [["헌혈 종류", "#types"], ["전후 팁", "#tips"], ["자주 묻는 질문", "#faq"]] },
  { id: "board",  href: "board.html",  label: "게시판", title: "게시판", tagline: "헌혈 후기와 궁금한 점을 함께 나눠요",
    sub: [["글 목록", "#list"]] },
  { id: "map",    href: "map.html",    label: "지도", title: "헌혈의집 찾기", tagline: "가까운 헌혈의집을 지도에서 찾아보세요",
    sub: [["헌혈의집 찾기", "#find"]] }
];

/* 메뉴에는 안 넣지만 페이지 히어로(제목 띠)는 필요한 페이지 */
var EXTRA_PAGES = [
  { id: "login",  label: "로그인",   title: "로그인",   tagline: "헌혈 기록과 기부 약속을 내 계정으로 관리해요", sub: [] },
  { id: "signup", label: "회원가입", title: "회원가입", tagline: "이메일 하나로 헌혈나눔을 시작해 보세요",       sub: [] }
];

var RELATED_SITES = [
  ["혈액정보 (혈액관리본부)", "https://www.bloodinfo.net"],
  ["대한적십자사", "https://www.redcross.or.kr"],
  ["한국백혈병어린이재단", "https://www.kclf.org"],
  ["한국백혈병소아암협회", "https://childhoodcancer.or.kr"]
];

var REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

/* ── 저장 (localStorage가 막혀 있어도 페이지가 죽지 않게) ── */
function loadJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* ── 문자열 / 날짜 ── */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function toDateStr(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function parseDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ── 토스트 ── */
var toastTimer = null;
function showToast(text) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
}

/* ── 아이콘 스프라이트 (선 아이콘, 모든 페이지에서 <use href="#i-이름">으로 사용) ── */
var ICON_PATHS = {
  drop:     "M12 3S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 3 12 3z",
  heart:    "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  calendar: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4",
  clock:    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  chart:    "M4 20V10M10 20V4M16 20v-7M22 20H2",
  pin:      "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  book:     "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7",
  help:     "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17.2v.01",
  edit:     "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  menu:     "M4 7h16M4 12h16M4 17h16",
  close:    "M6 6l12 12M18 6L6 18",
  up:       "M12 19V5M5 12l7-7 7 7",
  home:     "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  chevron:  "M9 6l6 6-6 6"
};
function iconSvg(name, cls) {
  return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
}
function iconSprite() {
  var symbols = Object.keys(ICON_PATHS).map(function (k) {
    return '<symbol id="i-' + k + '" viewBox="0 0 24 24"><path d="' + ICON_PATHS[k] + '"/></symbol>';
  }).join("");
  return '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + symbols + "</defs></svg>";
}

var LOGO_MARK = '<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">' +
  '<path d="M16 2.5S5.5 14 5.5 20.2a10.5 10.5 0 0 0 21 0C26.5 14 16 2.5 16 2.5z" fill="#d7263d"/>' +
  '<path d="M16 24.2s-5-3.1-5-7a2.9 2.9 0 0 1 5-1.9 2.9 2.9 0 0 1 5 1.9c0 3.9-5 7-5 7z" fill="#fff"/></svg>';

/* ── 글자 크기 (유틸바 가/가+) ── */
var FS_KEY = "hn_fontsize";
function applyFontSize(size) {
  if (size === "md") document.documentElement.removeAttribute("data-fs");
  else document.documentElement.setAttribute("data-fs", size);
  document.querySelectorAll("[data-fs-btn]").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.getAttribute("data-fs-btn") === size));
  });
}

/* ── 레이아웃 조각 ── */
function buildUtilityBar() {
  return '<div class="utility-bar"><div class="inner">' +
    '<span class="utility-note">학생 프로젝트 · 표시된 요청·보유량은 예시 데이터예요</span>' +
    '<div class="fs-group" role="group" aria-label="글자 크기">' +
    '<button type="button" data-fs-btn="sm" aria-label="글자 작게">가-</button>' +
    '<button type="button" data-fs-btn="md" aria-label="글자 기본">가</button>' +
    '<button type="button" data-fs-btn="lg" aria-label="글자 크게">가+</button></div>' +
    '<span class="auth-links" id="auth-links"><a href="login.html">로그인</a><a href="signup.html">회원가입</a></span></div></div>';
}

function buildHeader(page) {
  var nav = NAV_ITEMS.map(function (it) {
    var drop = it.sub.map(function (s) { return '<a href="' + it.href + s[1] + '">' + s[0] + "</a>"; }).join("");
    return '<div class="nav-item"><a href="' + it.href + '" class="nav-link' + (it.id === page ? " active" : "") + '">' + it.label +
      '</a><div class="dropdown">' + drop + "</div></div>";
  }).join("");

  var mobile = NAV_ITEMS.map(function (it) {
    var subs = it.sub.map(function (s) { return '<a href="' + it.href + s[1] + '">' + s[0] + "</a>"; }).join("");
    return '<div class="mm-group"><a class="mm-title' + (it.id === page ? " active" : "") + '" href="' + it.href + '">' + it.label + '</a>' +
      '<div class="mm-subs">' + subs + "</div></div>";
  }).join("");

  return '<header class="site-header"><div class="inner header-main">' +
    '<a class="logo" href="index.html" aria-label="' + SITE_NAME + ' 홈">' + LOGO_MARK + '<span class="logo-text">헌혈<em>나눔</em></span></a>' +
    '<nav class="main-nav" aria-label="주 메뉴">' + nav + "</nav>" +
    '<a class="btn header-cta" href="match.html#requests">헌혈증 기부하기</a>' +
    '<button type="button" class="burger" id="burger" aria-expanded="false" aria-controls="mobile-menu" aria-label="메뉴 열기">' + iconSvg("menu") + "</button></div>" +
    '<div class="mobile-menu" id="mobile-menu"><div class="inner">' + mobile + "</div></div></header>";
}

function buildPageHero(page) {
  var item = NAV_ITEMS.concat(EXTRA_PAGES).filter(function (it) { return it.id === page; })[0];
  if (!item || !item.title) return "";
  var hero = '<section class="page-hero"><div class="inner">' +
    '<div class="crumbs"><a href="index.html" aria-label="홈">' + iconSvg("home") + '</a>' + iconSvg("chevron") + "<span>" + item.label + "</span></div>" +
    "<h1>" + item.title + "</h1><p>" + item.tagline + "</p></div></section>";
  if (item.sub.length > 1) {
    hero += '<nav class="section-tabs" aria-label="이 페이지의 구역"><div class="inner">' +
      item.sub.map(function (s, i) { return '<a href="' + s[1] + '"' + (i === 0 ? ' class="on"' : "") + ">" + s[0] + "</a>"; }).join("") +
      "</div></nav>";
  }
  return hero;
}

function buildFooter() {
  var links = NAV_ITEMS.map(function (it) { return '<a href="' + it.href + '">' + it.label + "</a>"; }).join("");
  var related = RELATED_SITES.map(function (r) { return '<a href="' + r[1] + '" target="_blank" rel="noopener">' + r[0] + "</a>"; }).join("");
  return '<footer class="site-footer"><div class="inner footer-grid">' +
    '<div class="footer-brand"><a class="logo" href="index.html">' + LOGO_MARK + '<span class="logo-text">헌혈<em>나눔</em></span></a>' +
    "<p>" + SITE_TAGLINE + ".<br>헌혈증 기부 매칭 · 헌혈 기록 · 혈액 현황 · 헌혈의집 지도를 한 곳에서.</p></div>" +
    "<div><h4>바로가기</h4>" + links + "</div><div><h4>관련 기관</h4>" + related + "</div></div>" +
    '<div class="footer-bottom"><div class="inner"><span>© 2026 ' + SITE_NAME + " · 모바일 웹 프로젝트 (학생 작품)</span>" +
    '<span class="legal"><a href="#" data-soon="이용약관">이용약관</a><a href="#" data-soon="개인정보처리방침">개인정보처리방침</a></span></div></div></footer>';
}

function renderLayout() {
  var page = document.body.getAttribute("data-page");
  document.body.insertAdjacentHTML("afterbegin",
    iconSprite() + '<a class="skip-link" href="#main">본문으로 바로가기</a>' +
    buildUtilityBar() + buildHeader(page) + buildPageHero(page));
  var main = document.querySelector("main.page");
  if (main) main.id = "main";
  document.body.insertAdjacentHTML("beforeend", buildFooter() +
    '<button type="button" class="back-top" id="back-top" aria-label="맨 위로">' + iconSvg("up") + "</button>" +
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
}

function initLayout() {
  /* 글자 크기 */
  var saved = loadJson(FS_KEY, "md");
  applyFontSize(saved);
  document.querySelectorAll("[data-fs-btn]").forEach(function (b) {
    b.addEventListener("click", function () {
      var size = b.getAttribute("data-fs-btn");
      saveJson(FS_KEY, size);
      applyFontSize(size);
    });
  });

  /* 모바일 메뉴 */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobile-menu");
  burger.addEventListener("click", function () {
    var open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    burger.innerHTML = iconSvg(open ? "close" : "menu");
  });

  /* 아직 만들지 않은 기능(이용약관 등) */
  document.querySelectorAll("[data-soon]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      showToast(a.getAttribute("data-soon") + " 기능은 준비 중이에요");
    });
  });

  /* 맨 위로 버튼 */
  var backTop = document.getElementById("back-top");
  window.addEventListener("scroll", function () {
    backTop.classList.toggle("show", window.scrollY > 400);
  }, { passive: true });
  backTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* 섹션 탭: 보고 있는 구역을 강조 */
  var tabs = document.querySelectorAll(".section-tabs a");
  if (tabs.length && "IntersectionObserver" in window) {
    var byId = {};
    tabs.forEach(function (t) { byId[t.getAttribute("href").slice(1)] = t; });
    var setOn = function (id) {
      tabs.forEach(function (t) { t.classList.toggle("on", t === byId[id]); });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setOn(en.target.id); });
    }, { rootMargin: "-25% 0px -65% 0px" });
    Object.keys(byId).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }
}

renderLayout();
initLayout();
