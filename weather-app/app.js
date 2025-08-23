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

// Group by WMO codes
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
function emojiForGroup(g) {
  return g === "clear"   ? "☀️"
       : g === "clouds"  ? "⛅"
       : g === "rain"    ? "🌧️"
       : g === "snow"    ? "🌨️"
       : g === "thunder" ? "⛈️"
       :                   "💨";
}

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
let compare = []; // { key, loc, data }

function renderTable() {
  table.style.setProperty("--cols", String(compare.length));
  table.innerHTML = "";

  if (compare.length === 0) {
    const row = document.createElement("div");
    row.className = "wx-row";
    const cell = document.createElement("div");
    cell.className = "wx-cell";
    cell.style.gridColumn = `1 / span ${1 + compare.length}`;
    cell.textContent = "Add up to 3 locations to compare.";
    table.append(row, cell);
    return;
  }

  function addRow(label, getVal, bgClassForCol = null, header = false) {
    const row = document.createElement("div");
    row.className = "wx-row" + (header ? " wx-header" : "");
    const lab = document.createElement("div");
    lab.className = "wx-cell wx-label";
    lab.setAttribute("role", header ? "columnheader" : "rowheader");
    lab.textContent = label;
    row.appendChild(lab);

    compare.forEach((entry) => {
      const cell = document.createElement("div");
      cell.className = "wx-cell" + (bgClassForCol ? ` ${bgClassForCol(entry)}` : "");
      cell.setAttribute("role", header ? "columnheader" : "cell");

      const content = document.createElement("div");
      content.className = "wx-cell-inner";

      const val = getVal(entry);
      if (val instanceof Node) content.appendChild(val);
      else content.textContent = val;

      cell.appendChild(content);
      row.appendChild(cell);
    });

    table.appendChild(row);
  }

  // Header + emoji + remove button
  addRow("Metric", (entry) => {
    const wrap = document.createElement("div");
    wrap.className = "wx-colhead";

    const left = document.createElement("span");
    const g = weatherGroup(entry.data.current_weather.weathercode);
    left.innerHTML = `<span class="wx-emoji">${emojiForGroup(g)}</span>${placeText(entry.loc)}`;

    const btn = document.createElement("button");
    btn.className = "remove"; btn.title = "Remove";
    btn.setAttribute("aria-label", `Remove ${placeText(entry.loc)} from comparison`);
    btn.textContent = "×";
    btn.addEventListener("click", () => removeFromCompare(entry.key));

    wrap.append(left, btn);
    return wrap;
  }, (entry) => `bg-${weatherGroup(entry.data.current_weather.weathercode)}`, true);

  // Data rows
  addRow("Condition", (e) => weatherText(e.data.current_weather.weathercode),
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
  addRow("Temperature now", (e) => `${Math.round(e.data.current_weather.temperature)}°C`,
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
  addRow("Min today", (e) => `${Math.round(e.data.daily.temperature_2m_min[0])}°C`,
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
  addRow("Max today", (e) => `${Math.round(e.data.daily.temperature_2m_max[0])}°C`,
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
  addRow("Wind now", (e) => `${Math.round(e.data.current_weather.windspeed)} km/h`,
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
  addRow("Rain today", (e) => `${Math.round((e.data.daily.precipitation_sum[0] || 0) * 10) / 10} mm`,
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
  addRow("Local time", (e) => new Date(e.data.current_weather.time).toLocaleString(),
         (e) => `bg-${weatherGroup(e.data.current_weather.weathercode)}`);
}

function removeFromCompare(key) {
  compare = compare.filter(e => e.key !== key);
  renderTable();
}

async function addToCompareFlow(loc) {
  try {
    if (compare.length >= 3) { setStatus("Comparison is full (3). Remove one to add another."); return; }
    setStatus(`Fetching weather for ${placeText(loc)}…`);
    const data = await fetchWeather(loc.latitude, loc.longitude);
    const key = locKey(loc);
    if (compare.some(e => e.key === key)) { setStatus("That place is already in the comparison."); return; }
    compare.push({ key, loc, data });
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
  if (compare.length === 0) return;
  compare = [];
  renderTable();
  setStatus("Cleared all compared places.");
  setTimeout(clearStatus, 1200);
});

// ----- Initial -----
renderTable();
