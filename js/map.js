/* 헌혈의집 지도: 구글 지도 임베드 + 지역 바로가기 + 내 주변(위치 권한) */
var DEFAULT_REGION = "수원";
var KEYWORD = "헌혈의집";

var mapIframe = document.getElementById("map-iframe");
var searchForm = document.getElementById("map-search-form");
var searchInput = document.getElementById("map-search-input");
var nearBtn = document.getElementById("map-near-btn");
var locationText = document.getElementById("map-location-text");
var chipsEl = document.getElementById("map-chips");

function embedUrl(query, ll) {
  var url = "https://maps.google.com/maps?q=" + encodeURIComponent(query);
  if (ll) url += "&ll=" + ll + "&z=14";
  return url + "&output=embed";
}

function showOnMap(query, label, ll) {
  mapIframe.src = embedUrl(query, ll);
  locationText.textContent = label;
}

function searchRegion(region) {
  var q = region.indexOf(KEYWORD) !== -1 ? region : KEYWORD + " " + region;
  showOnMap(q, q);
}

REGIONS.concat(["수원", "화성"]).forEach(function (r) {
  chipsEl.insertAdjacentHTML("beforeend", '<button type="button" class="chip" data-region="' + r + '">' + r + "</button>");
});
chipsEl.addEventListener("click", function (e) {
  var chip = e.target.closest("[data-region]");
  if (!chip) return;
  searchInput.value = chip.getAttribute("data-region");
  searchRegion(chip.getAttribute("data-region"));
});

searchForm.addEventListener("submit", function (e) {
  e.preventDefault();
  var q = searchInput.value.trim();
  if (q) searchRegion(q);
});

nearBtn.addEventListener("click", function () {
  if (!navigator.geolocation) {
    locationText.textContent = "이 브라우저에서는 위치 확인을 지원하지 않아요. 지역을 직접 검색해 주세요.";
    return;
  }
  locationText.textContent = "내 위치 확인 중…";
  navigator.geolocation.getCurrentPosition(function (pos) {
    showOnMap(KEYWORD, "내 주변 " + KEYWORD, pos.coords.latitude + "," + pos.coords.longitude);
  }, function () {
    locationText.textContent = "위치를 가져오지 못했어요. 위치 권한을 허용하거나 지역을 직접 검색해 주세요.";
  });
});

searchRegion(DEFAULT_REGION);
