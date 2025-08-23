// ----- Elements -----
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const useLocBtn = document.getElementById("use-location");
const compareGrid = document.getElementById("compare");
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
  // Key by rounded lat/lon to avoid duplicates from API noise
  return `${Math.round(loc.latitude*1000)},${Math.round(loc.longitude*1000)}`;
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

    // clickable chip
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "chip"; btn.textContent = label;
    btn.addEventListener("click", () => addToCompareFlow(loc));
    recentWrap.appendChild(btn);

    // datalist option
    const opt = document.createElement("option");
    opt.value = label;
    recentDataList.appendChild(opt);
  });
}
updateRecentUI();

// ----- Compare model (max 3) -----
let compare = []; // array of { key, loc, data }

function renderCompare() {
  compareGrid.innerHTML = "";
  compare.forEach((entry, idx) => {
    const card = document.createElement("article");
    card.className = "card compare-card";

    // header
    const header = document.createElement("header");
    const h2 = document.createElement("h2"); h2.textContent = placeText(entry.loc);
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove"; removeBtn.title = "Remove";
    removeBtn.setAttribute("aria-label", `Remove ${placeText(entry.loc)} from comparison`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => removeFromCompare(idx));
    header.append(h2, removeBtn);

    // current summary
    const p = document.createElement("p");
    p.className = "current";
    const cw = entry.data.current_weather;
    p.textContent = `Now: ${cw.temperature}°C, wind ${cw.windspeed} km/h at ${new Date(cw.time).toLocaleTimeString()}`;

    // mini forecast (today + next 2 days)
    const mini = document.createElement("ul");
    mini.className = "mini";
    const { daily } = entry.data;
    const count = Math.min(3, daily?.time?.length || 0);
    for (let i = 0; i < count; i++) {
      const li = document.createElement("li");
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(daily.time[i]).toLocaleDateString(undefined, { weekday: "short" });
      const max = Math.round(daily.temperature_2m_max[i]);
      const min = Math.round(daily.temperature_2m_min[i]);
      const rain = Math.round((daily.precipitation_sum[i] || 0) * 10) / 10;
      li.innerHTML = `
        <span class="day">${dayName}</span>
        <span class="temp">Max ${max}°C / Min ${min}°C</span>
        <span class="rain">${rain} mm rain</span>
      `;
      mini.appendChild(li);
    }

    card.append(header, p, mini);
    compareGrid.appendChild(card);
  });
}

function removeFromCompare(idx) {
  compare.splice(idx, 1);
  renderCompare();
}

async function addToCompareFlow(loc) {
  try {
    if (compare.length >= 3) {
      setStatus("Comparison is full (3). Remove one to add another.");
      return;
    }
    setStatus(`Fetching weather for ${placeText(loc)}…`);
    const data = await fetchWeather(loc.latitude, loc.longitude);
    const key = locKey(loc);
    if (compare.some(e => e.key === key)) {
      setStatus("That place is already in the comparison.");
      return;
    }
    compare.push({ key, loc, data });
    addRecent(loc);
    renderCompare();
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
// Search/add to compare
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

// Use my location
useLocBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by your browser.");
    return;
  }
  if (compare.length >= 3) {
    setStatus("Comparison is full (3). Remove one to add another.");
    return;
  }
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
