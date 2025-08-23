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
  snow: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"snow","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.78,0.82,0.88,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":2,"ty":4,"nm":"flake1","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":0},{"t":10,"s":100},{"t":100,"s":0}]},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[85,75,0]},{"t":100,"s":[90,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[6,6]}},{"ty":"fl","c":{"a":0,"k":[1,1,1,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":3,"ty":4,"nm":"flake2","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":0},{"t":20,"s":100},{"t":110,"s":0}]},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[105,75,0]},{"t":100,"s":[110,110,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[6,6]}},{"ty":"fl","c":{"a":0,"k":[1,1,1,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]}]},
  thunder: {"v":"5.7.6","fr":60,"ip":0,"op":120,"w":200,"h":125,"nm":"thunder","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"cloud","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,55,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"el","p":{"a":0,"k":[-20,0]},"s":{"a":0,"k":[50,35]}},{"ty":"el","p":{"a":0,"k":[10,-8]},"s":{"a":0,"k":[60,40]}},{"ty":"rc","p":{"a":0,"k":[0,8]},"s":{"a":0,"k":[90,30]},"r":{"a":0,"k":15}},{"ty":"fl","c":{"a":0,"k":[0.71,0.69,0.85,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]},{"ddd":0,"ind":2,"ty":4,"nm":"bolt","sr":1,"ks":{"o":{"a":1,"k":[{"t":0,"s":0},{"t":90,"s":0},{"t":95,"s":100},{"t":105,"s":40},{"t":120,"s":0}]},"r":{"a":0,"k":0},"p":{"a":0,"k":[120,90,0]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"shapes":[{"ty":"gr","it":[{"ty":"sh","ks":{"a":0,"k":{"i":[],"o":[],"v":[[0,-10],[-6,8],[4,8],[-2,26],[8,10],[0,10]],"c":true}}},{"ty":"fl","c":{"a":0,"k":[0.97,0.91,0.11,1]},"o":{"a":0,"k":100}},{"ty":"tr","p":{"a":0,"k":[0,0]}}]}]}]}
};
LOT.wind = LOT.clouds;

// ----- Recents -----
let recents = safeLoad(RECENTS_KEY, []); // {name,country,admin1,latitude,longitude}
function saveRecents() { save(RECENTS_KEY, recents); }
function addRecent(loc) {
  const key = `${loc.name}|${loc.admin1 || ""}|${loc.country || ""}`;
  recents = [loc, ...recents.filter(r => `${r.name}|${r.admin1 || ""}|${r.country || ""}` !== key)];
  if (recents.length > 6) recents = recents.slice(0, 6);
  saveRecents();
  updateRecentUI();
}
function updateRecentUI() {
  recentWrap.innerHTML = "";
  recentDataList.innerHTML = "";
  recents.forEach(loc => {
    const label = placeText(loc);
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "chip"; btn.textContent = label;
    btn.addEventListener("click", () => addToCompareFlow(loc));
    recentWrap.appendChild(btn);

    const opt = document.createElement("option");
    opt.value = label;
    recentDataList.appendChild(opt);
  });
}
updateRecentUI();

// ----- Compare model (max 3) -----
let compare = []; // { key, loc, data, anim? }

// Ensure Lottie is ready (or report if missing)
function lottieAvailable() {
  return !!(window.lottie && typeof window.lottie.loadAnimation === "function");
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
      if (content instanceof Node) cell.appendChild(content); else cell.textContent = content;
      row.appendChild(cell);
    });

    table.appendChild(row);
  }

  // Header row: Lottie (top) + name/remove (bottom)
  addRow("Metric", (entry) => {
    const wrap = document.createElement("div");
    wrap.className = "wx-head";

    // Animation box
    const animBox = document.createElement("div");
    animBox.className = "wx-animbox";

    // Label bar
    const bar = document.createElement("div");
    bar.className = "wx-headbar";
    bar.textContent = placeText(entry.loc);
    const btn = document.createElement("button");
    btn.className = "remove"; btn.title = "Remove";
    btn.setAttribute("aria-label", `Remove ${placeText(entry.loc)} from comparison`);
    btn.textContent = "×";
    btn.addEventListener("click", () => removeFromCompare(entry.key));
    bar.appendChild(btn);

    wrap.append(animBox, bar);

    // Start / refresh Lottie (or fallback)
    const g = weatherGroup(entry.data.current_weather.weathercode);
    const data = LOT[g] || LOT.clouds;

    // Clean up previous if any
    if (entry.anim && entry.anim.destroy) entry.anim.destroy();

    const canAnimate = (forceAnim || !prefersReduced) && lottieAvailable();

    if (canAnimate) {
      try {
        entry.anim = lottie.loadAnimation({
          container: animBox,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data
        });
      } catch (e) {
        console.warn("Lottie failed, falling back to SVG:", e);
        entry.anim = null;
        animBox.appendChild(fallbackSVG(g));
      }
    } else {
      entry.anim = null;
      animBox.appendChild(fallbackSVG(g));
    }

    return wrap;
  }, true);

  // Data rows (static)
  addRow("Condition", (e) => weatherText(e.data.current_weather.weathercode));
  addRow("Temperature now", (e) => `${Math.round(e.data.current_weather.temperature)}°C`);
  addRow("Min today", (e) => `${Math.round(e.data.daily.temperature_2m_min[0])}°C`);
  addRow("Max today", (e) => `${Math.round(e.data.daily.temperature_2m_max[0])}°C`);
  addRow("Wind now", (e) => `${Math.round(e.data.current_weather.windspeed)} km/h`);
  addRow("Rain today", (e) => `${Math.round((e.data.daily.precipitation_sum[0] || 0) * 10) / 10} mm`);
  addRow("Local time", (e) => new Date(e.data.current_weather.time).toLocaleString());
}

function removeFromCompare(key) {
  const idx = compare.findIndex(e => e.key === key);
  if (idx !== -1 && compare[idx].anim && compare[idx].anim.destroy) {
    compare[idx].anim.destroy();
  }
  compare.splice(idx, 1);
  renderTable();
}

async function addToCompareFlow(loc) {
  try {
    if (compare.length >= 3) { setStatus("Comparison is full (3). Remove one to add another."); return; }
    setStatus(`Fetching weather for ${placeText(loc)}…`);
    const data = await fetchWeather(loc.latitude, loc.longitude);
    const key = locKey(loc);
    if (compare.some(e => e.key === key)) { setStatus("That place is already in the comparison."); return; }
    compare.push({ key, loc, data, anim: null });
    addRecent(loc);
    renderTable();
    clearStatus();
  } catch (err) {
    console.error(err);
    setStatus("Could not fetch weather for that place.");
  }
}

// ----- API calls -----
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

// ----- Events -----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = cityInput.value.trim();
  if (!q) return;
  setStatus(`Looking up "${q}"…`);
  try {
    const loc = await geocode(q);
    if (!loc) { setStatus(`No results for "${q}".`); return; }
    await addToCompareFlow({
      name: loc.name,
      country: loc.country,
      admin1: loc.admin1 || "",
      latitude: loc.latitude,
      longitude: loc.longitude
    });
    cityInput.value = "";
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Please try again.");
  }
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
    } catch (err) {
      console.error(err);
      setStatus("Couldn't get weather for your location.");
    }
  }, (err) => {
    setStatus(err.code === 1 ? "Permission denied. Please allow location access." : "Unable to retrieve your location.");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});

clearAllBtn.addEventListener("click", () => {
  compare.forEach(e => e.anim && e.anim.destroy && e.anim.destroy());
  compare = [];
  renderTable();
  setStatus("Cleared all compared places.");
  setTimeout(clearStatus, 1200);
});

// ----- Initial -----
renderTable();
