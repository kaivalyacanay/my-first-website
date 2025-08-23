// ----- Elements -----
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const useLocBtn = document.getElementById("use-location");
const clearAllBtn = document.getElementById("clear-all");
const table = document.getElementById("wx-table");
const recentWrap = document.getElementById("recent");
const recentDataList = document.getElementById("recent-cities");

// ----- Storage keys -----
const RECENTS_KEY = "weather.recents.v1";

// ----- Motion preference -----
const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Allow override via URL: ?anim=force (for debugging)
const urlParams = new URLSearchParams(location.search);
const forceAnim = urlParams.get("anim") === "force";

// ----- Helpers -----
function setStatus(msg) { statusEl.textContent = msg; }
function clearStatus() { statusEl.textContent = ""; }
function safeLoad(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function placeText(loc) {
  return `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}${loc.country ? ", " + loc.country : ""}`.replace(/\s+/g, " ").trim();
}
function locKey(loc) {
  return `${Math.round(loc.latitude*1000)},${Math.round(loc.longitude*1000)}`;
}

// Weather groups & labels via WMO codes
function weatherGroup(code) {
  if ([0].includes(code)) return "clear";
  if ([1,2,3,45,48].includes(code)) return "clouds";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return "rain";
  if ([71,73,75,77,85,86].includes(code)) return "snow";
  if ([95,96,99].includes(code)) return "thunder";
  return "clouds";
}
function weatherText(code) {
  const map = {
    0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Depositing rime fog",
    51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",
    56:"Freezing drizzle",57:"Freezing drizzle (dense)",
    61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
    66:"Freezing rain (light)",67:"Freezing rain (heavy)",
    71:"Slight snow",73:"Moderate snow",75:"Heavy snow",
    77:"Snow grains",
    80:"Slight rain showers",81:"Moderate rain showers",82:"Violent rain showers",
    85:"Slight snow showers",86:"Heavy snow showers",
    95:"Thunderstorm",96:"Thunderstorm (small hail)",99:"Thunderstorm (large hail)"
  };
  return map[code] || "Cloudy";
}

// ----- Lightweight fallback SVG if Lottie unavailable -----
function fallbackSVG(group) {
  const span = document.createElement("span");
  span.style.display = "inline-flex";
  span.style.width = "28px";
  span.style.height = "28px";
  span.style.alignItems = "center";
  span.style.justifyContent = "center";
  span.style.marginRight = "8px";
  span.innerHTML =
    group === "clear" ? "☀️"
  : group === "clouds" ? "⛅"
  : group === "rain" ? "🌧️"
  : group === "snow" ? "🌨️"
  : group === "thunder" ? "⛈️"
  : "💨";
  return span;
}

// ----- Tiny embedded Lottie JSONs (very small, SVG renderer) -----
const LOT = {
  clear: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"sun-pulse","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"sun","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,62,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":1,"k":[{"t":0,"s":[100,100,100]},{"t":60,"s":[110,110,100]},{"t":120,"s":[100,100,100]}]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[52,52]},"d":1},{"ty":"fl","c":{"a":0,"k":[1,0.72,0,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ip":0,"op":120,"st":0,"bm":0}]},
  clouds: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"cloud-drift","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[100,60,0]},{"t":60,"s":[112,60,0]},{"t":120,"s":[100,60,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-22,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.78,0.82,0.88,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}],"ip":0,"op":120,"st":0,"bm":0}]},
  rain: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"rain","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.78,0.82,0.88,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":2,"ty":4,"nm":"drop1","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[80,75,0]},{"t":90,"s":[80,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"rc","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[4,14]},"r":{"a":0,"k":2}},{"ty":"fl","c":{"a":0,"k":[0.35,0.55,0.93,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":3,"ty":4,"nm":"drop2","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":10,"s":[100,75,0]},{"t":100,"s":[100,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"rc","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[4,14]},"r":{"a":0,"k":2}},{"ty":"fl","c":{"a":0,"k":[0.35,0.55,0.93,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":4,"ty":4,"nm":"drop3","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":20,"s":[120,75,0]},{"t":110,"s":[120,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"rc","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[4,14]},"r":{"a":0,"k":2}},{"ty":"fl","c":{"a":0,"k":[0.35,0.55,0.93,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]}]},
  snow: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"snow","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"t]()]()]()
