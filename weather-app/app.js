// Elements
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const currentCard = document.getElementById("current");
const placeEl = document.getElementById("place");
const currentSummaryEl = document.getElementById("current-summary");
const forecastCard = document.getElementById("forecast");
const dailyList = document.getElementById("daily-list");
const useLocBtn = document.getElementById("use-location");
const recentWrap = document.getElementById("recent");
const recentDataList = document.getElementById("recent-cities");

// Local storage keys
const RECENTS_KEY = "weather.recents.v1";

// ---- Utilities ----
function setStatus(msg) { statusEl.textContent = msg; }
function clearStatus() { statusEl.textContent = ""; }
function resetUI() {
  currentCard.hidden = true;
  forecastCard.hidden = true;
  dailyList.innerHTML = "";
  currentSummaryEl.textContent = "";
  placeEl.textContent = "";
}

// Safe JSON load
function safeLoad(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

// Recents
let recents = safeLoad(RECENTS_KEY, []); // each: {name,country,admin1,latitude,longitude}
function saveRecents() { localStorage.setItem(RECENTS_KEY, JSON.stringify(recents)); }
function addRecent(loc) {
  const key = `${loc.name}|${loc.admin1 || ""}|${loc.country}`;
  recents = [loc, ...recents.filter(r => `${r.name}|${r.admin1 || ""}|${r.country}` !== key)];
  if (recents.length > 6) recents = recents.slice(0, 6);
  saveRecents();
  updateRecentUI();
}
function updateRecentUI() {
  recentWrap.innerHTML = "";
  recentDataList.innerHTML = "";
  recents.forEach(loc => {
    // clickable chip
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}, ${loc.country}`;
    btn.addEventListener("click", async () => {
      try {
        resetUI();
        setStatus(`Fetching weather for ${loc.name}, ${loc.country}…`);
        const data = await fetchWeather(loc.latitude, loc.longitude);
        renderCurrent(loc, data);
        renderDaily(data);
        clearStatus();
      } catch (err) {
        console.error(err);
        setStatus("Could not fetch weather for that place.");
      }
    });
    recentWrap.appendChild(btn);

    // datalist option
    const opt = document.createElement("option");
    opt.value = btn.textContent;
    recentDataList.appendChild(opt);
  });
}
updateRecentUI();

// ---- API calls ----
// Geocoding (city -> lat/lon)
async function geocode(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const json = await res.json();
  return json.results && json.results.length ? json.results[0] : null;
}

// Forecast via Open-Meteo
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current_weather: "true",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto"
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

// ---- Render ----
function renderCurrent(loc, data) {
  placeEl.textContent = `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}${loc.country ? ", " + loc.country : ""}`.replace(/\s+/g, " ").trim();
  const cw = data.current_weather;
  currentSummaryEl.textContent = `Now: ${cw.temperature}°C, wind ${cw.windspeed} km/h at ${new Date(cw.time).toLocaleTimeString()}`;
  currentCard.hidden = false;
}
function renderDaily(data) {
  const { daily } = data;
  if (!daily?.time?.length) return;
  for (let i = 0; i < daily.time.length; i++) {
    const li = document.createElement("li");
    const date = new Date(daily.time[i]).toDateString();
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const rain = Math.round((daily.precipitation_sum[i] || 0) * 10) / 10;
    li.innerHTML = `
      <span>${date}</span>
      <span>Max ${max}°C / Min ${min}°C</span>
      <span>${rain} mm rain</span>
    `;
    dailyList.appendChild(li);
  }
  forecastCard.hidden = false;
}

// ---- Events ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = cityInput.value.trim();
  if (!q) return;
  resetUI();
  setStatus(`Looking up "${q}"…`);
  try {
    const loc = await geocode(q);
    if (!loc) { setStatus(`No results for "${q}".`); return; }
    setStatus(`Fetching weather for ${loc.name}, ${loc.country}…`);
    const data = await fetchWeather(loc.latitude, loc.longitude);
    // remember in recents
    addRecent({
      name: loc.name,
      country: loc.country,
      admin1: loc.admin1 || "",
      latitude: loc.latitude,
      longitude: loc.longitude
    });
    renderCurrent(loc, data);
    renderDaily(data);
    clearStatus();
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
  setStatus("Getting your location…");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      setStatus("Fetching weather for your location…");
      const data = await fetchWeather(latitude, longitude);
      const loc = { name: "Your location", country: "", admin1: "", latitude, longitude };
      renderCurrent(loc, data);
      renderDaily(data);
      clearStatus();
    } catch (err) {
      console.error(err);
      setStatus("Couldn't get weather for your location.");
    }
  }, (err) => {
    setStatus(err.code === 1 ? "Permission denied. Please allow location access." : "Unable to retrieve your location.");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});
