/* 혈액 현황: 대시보드(도넛 + 혈액형별 막대)와 "내 혈액형" 선택 — 데이터와 단계 기준은 data.js */
var dashEl = document.getElementById("stock-dash");
var mySelect = document.getElementById("my-type");
var myMsg = document.getElementById("my-type-msg");

mySelect.value = loadJson(MYTYPE_KEY, "");

function render() {
  renderStockDash(dashEl);

  var mine = mySelect.value;
  var found = STOCK.filter(function (s) { return s.type === mine; })[0];
  if (!found) { myMsg.innerHTML = ""; return; }
  var lv = levelOf(found.days);
  myMsg.innerHTML = lv.n >= 3
    ? "<strong>" + mine + "형이 " + lv.label + " 단계예요.</strong> <a href=\"record.html#next\">내 헌혈 가능일 확인</a> · <a href=\"map.html\">헌혈의집 찾기</a>"
    : mine + "형은 현재 " + lv.label + " 단계예요.";
}

mySelect.addEventListener("change", function () {
  saveJson(MYTYPE_KEY, mySelect.value);
  render();
});

render();
