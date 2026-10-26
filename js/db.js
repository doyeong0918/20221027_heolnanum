/* 로그인한 사용자의 데이터(헌혈 기록 · 기부 약속 · 도움 요청)를 Supabase DB에서 읽고 쓰는 함수 모음
   (auth.js 다음에 로드. 화면 코드가 쓰던 객체 모양 {id, date, type, place} 등은 그대로 돌려준다)
   테이블 정의와 RLS 정책은 supabase/schema.sql — 여기서는 user_id 를 보내지 않는다 (DB가 로그인 사용자로 채움) */

/* 로그인한 사용자를 돌려줌 (비로그인이거나 연결 설정이 없으면 null) */
function currentUser() {
  if (!hnClient) return Promise.resolve(null);
  return hnClient.auth.getSession().then(function (res) {
    return res.data.session ? res.data.session.user : null;
  });
}

function unwrap(res) {
  if (res.error) throw res.error;
  return res.data;
}

function dbErrorText(err) {
  var code = (err && err.code) || "";
  var msg = (err && err.message) || "";
  if (code === "PGRST205" || code === "42P01") return "DB 테이블이 아직 없어요. supabase/schema.sql 을 SQL Editor 에서 실행해 주세요.";
  if (code === "PGRST301" || /jwt/i.test(msg)) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (code === "42501") return "권한이 없어요. 다시 로그인해 주세요.";
  if (code === "23514") return "입력한 값이 올바르지 않아요.";
  if (code === "PGRST116") return "글을 찾을 수 없거나 권한이 없어요.";
  if (/fetch|network/i.test(msg)) return "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
  return "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

/* 안내 상자 / 로그인 유도 (텍스트는 escape 해서 넣는다) */
function noticeHtml(text) {
  return '<div class="notice">' + escapeHtml(text) + "</div>";
}
/* 로그인 뒤 지금 보던 페이지로 돌아오게 하는 로그인 주소 (login.js 가 next 를 읽는다) */
function loginHref() {
  return "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search);
}
function loginNoticeHtml(what) {
  return '<div class="notice"><strong>로그인이 필요해요</strong> · ' + escapeHtml(what) +
    ' <a href="' + loginHref() + '">로그인</a> 또는 <a href="signup.html">회원가입</a>을 해 주세요.</div>';
}

/* ── 헌혈 기록 ── */
var RECORD_COLS = "id, donated_on, type, place";
function toRecord(r) { return { id: r.id, date: r.donated_on, type: r.type, place: r.place }; }

function dbListRecords() {
  return hnClient.from("donation_records").select(RECORD_COLS).order("donated_on", { ascending: false })
    .then(unwrap).then(function (rows) { return rows.map(toRecord); });
}
function dbAddRecord(rec) {
  return hnClient.from("donation_records").insert({ donated_on: rec.date, type: rec.type, place: rec.place })
    .select(RECORD_COLS).single().then(unwrap).then(toRecord);
}
function dbDeleteRecord(id) {
  return hnClient.from("donation_records").delete().eq("id", id).then(unwrap);
}

/* ── 기부 약속 (오래된 것부터: 화면에서 뒤집어 최신순으로 보여줌) ── */
var PLEDGE_COLS = "id, request_id, amount, nickname, message, created_at";
function toPledge(r) {
  return { id: r.id, reqId: r.request_id, count: r.amount, nick: r.nickname, msg: r.message, at: toDateStr(new Date(r.created_at)) };
}

function dbListPledges() {
  return hnClient.from("pledges").select(PLEDGE_COLS).order("created_at", { ascending: true })
    .then(unwrap).then(function (rows) { return rows.map(toPledge); });
}
function dbAddPledge(p) {
  return hnClient.from("pledges").insert({ request_id: p.reqId, amount: p.count, nickname: p.nick, message: p.msg })
    .select(PLEDGE_COLS).single().then(unwrap).then(toPledge);
}
function dbDeletePledge(id) {
  return hnClient.from("pledges").delete().eq("id", id).then(unwrap);
}

/* ── 도움 요청 ── */
var REQUEST_COLS = "id, alias, region, reason, need, story, created_at";
function toMyRequest(r) {
  return { id: r.id, alias: r.alias, region: r.region, reason: r.reason, need: r.need, story: r.story, at: toDateStr(new Date(r.created_at)) };
}

function dbListMyRequests() {
  return hnClient.from("help_requests").select(REQUEST_COLS).order("created_at", { ascending: true })
    .then(unwrap).then(function (rows) { return rows.map(toMyRequest); });
}
function dbAddRequest(r) {
  return hnClient.from("help_requests").insert({ alias: r.alias, region: r.region, reason: r.reason, need: r.need, story: r.story })
    .select(REQUEST_COLS).single().then(unwrap).then(toMyRequest);
}
function dbDeleteRequest(id) {
  return hnClient.from("help_requests").delete().eq("id", id).then(unwrap);
}

/* ── 게시판 (읽기는 로그인 없이도 가능. 작성자 이름은 DB가 채운다 → schema.sql 의 posts) ── */
var POST_CATEGORIES = [["review", "헌혈 후기"], ["question", "질문"], ["free", "자유"]];
function categoryLabel(key) {
  var found = POST_CATEGORIES.filter(function (c) { return c[0] === key; })[0];
  return found ? found[1] : "";
}

var POST_COLS = "id, user_id, author_name, category, title, content, created_at, updated_at";
var POST_LIST_COLS = "id, user_id, author_name, category, title, created_at, updated_at";   /* 목록에는 본문을 받지 않는다 */
function toPost(r) {
  return {
    id: r.id, userId: r.user_id, author: r.author_name, category: r.category, title: r.title,
    content: r.content, createdAt: r.created_at, updatedAt: r.updated_at
  };
}

/* opt: { category, q, page, size } → { posts, total } */
function dbListPosts(opt) {
  var from = (opt.page - 1) * opt.size;
  var query = hnClient.from("posts").select(POST_LIST_COLS, { count: "exact" });
  if (opt.category) query = query.eq("category", opt.category);
  /* 검색어가 필터 문법(쉼표·괄호·따옴표·와일드카드)을 깨지 못하도록 공백으로 바꾼다 */
  var q = opt.q.replace(/[,()"\\%*_]/g, " ").trim();
  if (q) query = query.or("title.ilike.*" + q + "*,content.ilike.*" + q + "*");
  return query.order("created_at", { ascending: false }).range(from, from + opt.size - 1).then(function (res) {
    if (res.error) throw res.error;
    return { posts: res.data.map(toPost), total: res.count || 0 };
  });
}
function dbGetPost(id) {
  return hnClient.from("posts").select(POST_COLS).eq("id", id).maybeSingle().then(function (res) {
    if (res.error && res.error.code === "22P02") return null;   /* uuid 모양이 아닌 id = 없는 글 */
    return unwrap(res);
  }).then(function (r) { return r ? toPost(r) : null; });
}
function dbAddPost(p) {
  return hnClient.from("posts").insert({ category: p.category, title: p.title, content: p.content })
    .select(POST_COLS).single().then(unwrap).then(toPost);
}
function dbUpdatePost(id, p) {
  return hnClient.from("posts").update({ category: p.category, title: p.title, content: p.content })
    .eq("id", id).select(POST_COLS).single().then(unwrap).then(toPost);
}
function dbDeletePost(id) {
  return hnClient.from("posts").delete().eq("id", id).select("id").then(unwrap).then(function (rows) {
    if (!rows.length) throw { code: "PGRST116" };   /* 내 글이 아니면 아무것도 지워지지 않는다 */
  });
}
