// ----- Elements -----
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const useLocBtn = document.getElementById("use-location");
const clearAllBtn = document.getElementById("clear-all");
const table = document.getElementById("wx-table");
const recentWrap = document.getElementById("recent");
const recentDataList = document.getElementById("recent-cities");
const animToggle = document.getElementById("anim-toggle");

// ----- Query flags -----
const urlParams = new URLSearchParams(location.search);
const forceAnim = urlParams.get("anim") === "force";
const demo = urlParams.get("demo") === "1";

// ----- Storage keys -----
const RECENTS_KEY = "weather.recents.v1";

// ----- Helpers -----
function setStatus(msg) { statusEl.textContent = msg; }
function clearStatus() { statusEl.textContent = ""; }
function safeLoad(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function isNode(n) { return n && (n.nodeType === 1 || n.nodeType === 11); }
function placeText(loc) { return `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}${loc.country ? ", " + loc.country : ""}`.replace(/\s+/g, " ").trim(); }
function locKey(loc) { return `${Math.round(loc.latitude*1000)},${Math.round(loc.longitude*1000)}`; }
function animationsWanted() { return animToggle ? animToggle.checked : true; }

// ----- Weather mapping -----
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
    77:"Snow grains",80:"Slight rain showers",81:"Moderate rain showers",82:"Violent rain showers",
    85:"Slight snow showers",86:"Heavy snow showers",
    95:"Thunderstorm",96:"Thunderstorm (small hail)",99:"Thunderstorm (large hail)"
  };
  return map[code] || "Cloudy";
}

// ----- Fallback inline SVG (always visible instantly) -----
function fallbackIcon(group) {
  const wrap = document.createElement("div");
  wrap.className = "wx-fallback";
  wrap.innerHTML =
    group === "clear" ? `
      <svg viewBox="0 0 56 56" role="img" aria-label="Sunny">
        <circle cx="28" cy="28" r="10" fill="#FDB813"/>
        <g stroke="#FDB813" stroke-width="3" stroke-linecap="round">
          <line x1="28" y1="4"  x2="28" y2="12"/>
          <line x1="28" y1="44" x2="28" y2="52"/>
          <line x1="4"  y1="28" x2="12" y2="28"/>
          <line x1="44" y1="28" x2="52" y2="28"/>
          <line x1="12" y1="12" x2="18" y2="18"/>
          <line x1="38" y1="38" x2="44" y2="44"/>
          <line x1="38" y1="18" x2="44" y2="12"/>
          <line x1="12" y1="44" x2="18" y2="38"/>
        </g>
      </svg>`
  : group === "clouds" ? `
      <svg viewBox="0 0 56 56" role="img" aria-label="Cloudy">
        <g fill="#C8D2E1">
          <circle cx="20" cy="28" r="10"/>
          <circle cx="30" cy="24" r="12"/>
          <rect x="12" y="28" width="32" height="12" rx="6"/>
        </g>
      </svg>`
  : group === "rain" ? `
      <svg viewBox="0 0 56 56" role="img" aria-label="Rain">
        <g fill="#C8D2E1">
          <circle cx="20" cy="24" r="10"/>
          <circle cx="30" cy="20" r="12"/>
          <rect x="12" y="24" width="32" height="12" rx="6"/>
        </g>
        <g stroke="#5A8DEE" stroke-width="3" stroke-linecap="round">
          <line x1="18" y1="40" x2="18" y2="50"/>
          <line x1="28" y1="40" x2="28" y2="50"/>
          <line x1="38" y1="40" x2="38" y2="50"/>
        </g>
      </svg>`
  : group === "snow" ? `
      <svg viewBox="0 0 56 56" role="img" aria-label="Snow">
        <g fill="#C8D2E1">
          <circle cx="20" cy="24" r="10"/>
          <circle cx="30" cy="20" r="12"/>
          <rect x="12" y="24" width="32" height="12" rx="6"/>
        </g>
        <g fill="#fff">
          <circle cx="18" cy="45" r="2"/>
          <circle cx="28" cy="45" r="2"/>
          <circle cx="38" cy="45" r="2"/>
        </g>
      </svg>`
  : group === "thunder" ? `
      <svg viewBox="0 0 56 56" role="img" aria-label="Thunder">
        <g fill="#B5B1D8">
          <circle cx="20" cy="24" r="10"/>
          <circle cx="30" cy="20" r="12"/>
          <rect x="12" y="24" width="32" height="12" rx="6"/>
        </g>
        <polygon points="26,30 22,42 30,42 26,52 36,36 30,36 32,30" fill="#F8E71C"/>
      </svg>`
  : `
      <svg viewBox="0 0 56 56" role="img" aria-label="Wind">
        <path d="M8 28 C20 24, 28 24, 48 28" fill="none" stroke="#9AA7B7" stroke-width="3" stroke-linecap="round"/>
        <path d="M12 36 C22 32, 30 32, 50 36" fill="none" stroke="#9AA7B7" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
  return wrap;
}

// ----- Lottie loader -----
function lottieAvailable() { return !!(window.lottie && typeof window.lottie.loadAnimation === "function"); }
function loadScriptOnce(src) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src; s.async = true; s.crossOrigin = "anonymous";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(lottieAvailable()), 4000);
  });
}
let lottieTried = false;
async function ensureLottie() {
  if (lottieAvailable()) return true;
  if (lottieTried) return false;
  lottieTried = true;
  const sources = [
    "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js",
    "https://unpkg.com/lottie-web@5.12.2/build/player/lottie.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"
  ];
  for (const url of sources) { if (await loadScriptOnce(url)) return true; }
  return lottieAvailable();
}

// ----- Recents -----
let recents = safeLoad(RECENTS_KEY, []);
function saveRecents() { save(RECENTS_KEY, recents); }
function addRecent(loc) {
  const key = `${loc.name}|${loc.admin1 || ""}|${loc.country || ""}`;
  recents = [loc, ...recents.filter(r => `${r.name}|${r.admin1 || ""}|${r.country || ""}` !== key)];
  if (recents.length > 6) recents = recents.slice(0, 6);
  saveRecents(); updateRecentUI();
}
function updateRecentUI() {
  recentWrap.innerHTML = ""; recentDataList.innerHTML = "";
  recents.forEach(loc => {
    const label = placeText(loc);
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "chip"; btn.textContent = label;
    btn.addEventListener("click", () => addToCompareFlow(loc));
    recentWrap.appendChild(btn);
    const opt = document.createElement("option"); opt.value = label; recentDataList.appendChild(opt);
  });
}
updateRecentUI();

// ----- Compare model -----
let compare = []; // { key, loc, data, animBox, anim? }

// Small embedded Lottie JSONs
const LOT = {
  clear: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"sun-pulse","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"sun","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,62,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":1,"k":[{"t":0,"s":[100,100,100]},{"t":60,"s":[110,110,100]},{"t":120,"s":[100,100,100]}]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[52,52]},"d":1},{"ty":"fl","c":{"a":0,"k":[1,0.72,0,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ip":0,"op":120,"st":0,"bm":0}]},
  clouds: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"cloud-drift","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[100,60,0]},{"t":60,"s":[112,60,0]},{"t":120,"s":[100,60,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-22,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.78,0.82,0.88,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}],"ip":0,"op":120,"st":0,"bm":0}]},
  rain: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"rain","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.78,0.82,0.88,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":2,"ty":4,"nm":"drop1","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[80,75,0]},{"t":90,"s":[80,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"rc","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[4,14]},"r":{"a":0,"k":2}},{"ty":"fl","c":{"a":0,"k":[0.35,0.55,0.93,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":3,"ty":4,"nm":"drop2","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":10,"s":[100,75,0]},{"t":100,"s":[100,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"rc","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[4,14]},"r":{"a":0,"k":2}},{"ty":"fl","c":{"a":0,"k":[0.35,0.55,0.93,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":4,"ty":4,"nm":"drop3","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":20,"s":[120,75,0]},{"t":110,"s":[120,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"rc","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[4,14]},"r":{"a":0,"k":2}},{"ty":"fl","c":{"a":0,"k":[0.35,0.55,0.93,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]}]},
  snow: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"snow","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.78,0.82,0.88,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":2,"ty":4,"nm":"flake1","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":0},{"t":10,"s":100},{"t":100,"s":0}]},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[85,75,0]},{"t":100,"s":[90,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[6,6]}},{"ty":"fl","c":{"a":0,"k":[1,1,1,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":3,"ty":4,"nm":"flake2","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":0},{"t":20,"s":100},{"t":110,"s":0}]},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[105,75,0]},{"t":100,"s":[110,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[6,6]}},{"ty":"fl","c":{"a":0,"k":[1,1,1,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]}]},
  thunder: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"thunder","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.71,0.69,0.85,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":2,"ty":4,"nm":"bolt","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":0},{"t":90,"s":0},{"t":95,"s":100},{"t":105,"s":40},{"t":120,"s":0}]},"r":{"a":0,"k":0},"p":{"a":0,"k":[120,90,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"sh","ks":{"a":0,"k":{"i":[],"o":[],"v":[[0,-10],[-6,8],[4,8],[-2,26],[8,10],[0,10]],"c":true}}},{"ty":"fl","c":{"a":0,"k":[0.97,0.91,0.11,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]}]}
};
LOT.wind = LOT.clouds;

function lottieUpgrade(entry, animBox, group) {
  const data = LOT[group] || LOT.clouds;
  try {
    entry.anim = window.lottie.loadAnimation({ container: animBox, renderer: "svg", loop: true, autoplay: true, animationData: data });
  } catch (e) { entry.anim = null; }
}

function renderTable() {
  table.style.setProperty("--cols", String(compare.length));
  table.innerHTML = "";

  if (compare.length === 0) {
    const row = document.createElement("div"); row.className = "wx-row";
    const cell = document.createElement("div"); cell.className = "wx-cell";
    cell.style.gridColumn = `1 / span ${1 + compare.length}`;
    cell.textContent = "Add up to 3 locations to compare.";
    table.append(row, cell);
    return;
  }

  function addRow(label, getVal, header = false) {
    const row = document.createElement("div");
    row.className = "wx-row" + (header ? " wx-header" : "");
    const lab = document.createElement("div");
    lab.className = "wx-cell wx-label";
    lab.setAttribute("role", header ? "columnheader" : "rowheader");
    lab.textContent = label;
    row.appendChild(lab);

    compare.forEach((entry) => {
      const cell = document.createElement("div");
      cell.className = "wx-cell";
      cell.setAttribute("role", header ? "columnheader" : "cell");

      const content = getVal(entry);
      if (isNode(content)) cell.appendChild(content); else cell.textContent = content;
      row.appendChild(cell);
    });
    table.appendChild(row);
  }

  // Header row: static SVG now, Lottie upgrade if enabled & available
  addRow("Metric", (entry) => {
    const wrap = document.createElement("div"); wrap.className = "wx-head";
    const animBox = document.createElement("div"); animBox.className = "wx-animbox";

    const g = weatherGroup(entry.data.current_weather.weathercode);
    animBox.appendChild(fallbackIcon(g)); // always visible

    const bar = document.createElement("div"); bar.className = "wx-headbar"; bar.textContent = placeText(entry.loc);
    const btn = document.createElement("button"); btn.className = "remove"; btn.title = "Remove";
    btn.setAttribute("aria-label", `Remove ${placeText(entry.loc)} from comparison`);
    btn.textContent = "×"; btn.addEventListener("click", () => removeFromCompare(entry.key));
    bar.appendChild(btn);

    wrap.append(animBox, bar);

    // Save ref & try to animate
    entry.animBox = animBox;
    entry.anim && entry.anim.destroy && entry.anim.destroy();
    entry.anim = null;

    if (animationsWanted()) {
      if (lottieAvailable()) {
        animBox.innerHTML = ""; lottieUpgrade(entry, animBox, g);
      } else {
        ensureLottie().then((ok) => {
          if (ok && compare.find(e => e.key === entry.key) && entry.animBox && animationsWanted()) {
            entry.animBox.innerHTML = ""; lottieUpgrade(entry, entry.animBox, g);
          }
        });
      }
    }

    return wrap;
  }, true);

  // Data rows
  addRow("Condition", (e) => weatherText(e.data.current_weather.weathercode));
  addRow("Temperature now", (e) => `${Math.round(e.data.current_weather.temperature)}°C`);
  addRow("Min today", (e) => `${Math.round(e.data.daily.temperature_2m_min[0])}°C`);
  addRow("Max today", (e) => `${Math.round(e.data.daily.temperature_2m_max[0])}°C`);
  addRow("Wind now", (e) => `${Math.round(e.data.current_weather.windspeed)} km/h`);
  addRow("Rain today", (e) => `${Math.round((e.data.daily.precipitation_sum[0] || 0) * 10) / 10} mm`);
  addRow("Local time", (e) => new Date(e.data.current_weather.time).toLocaleString());

  // Show quick status (helps diagnose)
  setStatus(`Animations: ${animationsWanted() ? "ON" : "OFF"} • Lottie ${lottieAvailable() ? "loaded" : "not loaded yet"}`);
}

function removeFromCompare(key) {
  const idx = compare.findIndex(e => e.key === key);
  if (idx !== -1 && compare[idx].anim && compare[idx].anim.destroy) compare[idx].anim.destroy();
  compare.splice(idx, 1); renderTable();
}

// ----- API -----
async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const json = await res.json();
  return json.results && json.results.length ? json.results[0] : null;
}
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current_weather: "true",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto"
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

async function addToCompareFlow(loc) {
  try {
    if (compare.length >= 3) { setStatus("Comparison is full (3). Remove one to add another."); return; }
    setStatus(`Fetching weather for ${placeText(loc)}…`);
    const data = await fetchWeather(loc.latitude, loc.longitude);
    const key = locKey(loc);
    if (compare.some(e => e.key === key)) { setStatus("That place is already in the comparison."); return; }
    compare.push({ key, loc, data, anim: null, animBox: null });
    addRecent(loc); renderTable(); clearStatus();
  } catch (err) { console.error(err); setStatus("Could not fetch weather for that place."); }
}

// ----- Events -----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = cityInput.value.trim(); if (!q) return;
  setStatus(`Looking up "${q}"…`);
  try {
    const loc = await geocode(q);
    if (!loc) { setStatus(`No results for "${q}".`); return; }
    await addToCompareFlow({ name: loc.name, country: loc.country, admin1: loc.admin1 || "", latitude: loc.latitude, longitude: loc.longitude });
    cityInput.value = "";
  } catch (err) { console.error(err); setStatus("Something went wrong. Please try again."); }
});

useLocBtn.addEventListener("click", () => {
  if (!navigator.geolocation) { setStatus("Geolocation is not supported by your browser."); return; }
  if (compare.length >= 3) { setStatus("Comparison is full (3). Remove one to add another."); return; }
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      const loc = { name: "Your location", country: "", admin1: "", latitude, longitude };
      await addToCompareFlow(loc);
    } catch (err) { console.error(err); setStatus("Couldn't get weather for your location."); }
  }, (err) => {
    setStatus(err.code === 1 ? "Permission denied. Please allow location access." : "Unable to retrieve your location.");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});

clearAllBtn.addEventListener("click", () => {
  compare.forEach(e => e.anim && e.anim.destroy && e.anim.destroy());
  compare = []; renderTable(); setStatus("Cleared all compared places."); setTimeout(clearStatus, 1200);
});

animToggle?.addEventListener("change", () => { renderTable(); });

// ----- Demo mode -----
async function bootDemo() {
  const samples = [
    { name:"Mumbai", admin1:"Maharashtra", country:"India", latitude:19.076, longitude:72.8777, demoCode: 2 },
    { name:"London", admin1:"England", country:"UK", latitude:51.5074, longitude:-0.1278, demoCode: 61 },
    { name:"Tokyo", admin1:"Tokyo", country:"Japan", latitude:35.6762, longitude:139.6503, demoCode: 0 }
  ];
  for (const s of samples) {
    try {
      const data = await fetchWeather(s.latitude, s.longitude);
      compare.push({ key: locKey(s), loc: s, data, anim: null, animBox: null });
    } catch {
      const now = new Date().toISOString();
      const data = {
        current_weather: { weathercode: s.demoCode, temperature: 26, windspeed: 9, time: now },
        daily: { temperature_2m_min: [22], temperature_2m_max: [31], precipitation_sum: [3] }
      };
      compare.push({ key: locKey(s), loc: s, data, anim: null, animBox: null });
    }
  }
  renderTable();
}

// ----- Initial -----
if (demo) { bootDemo(); } else { renderTable(); }
