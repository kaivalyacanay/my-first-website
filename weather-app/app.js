const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const currentCard = document.getElementById("current");
const placeEl = document.getElementById("place");
const currentSummaryEl = document.getElementById("current-summary");
const forecastCard = document.getElementById("forecast");
const dailyList = document.getElementById("daily-list");

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

    renderCurrent(loc, data);
    renderDaily(data);
    clearStatus();
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Please try again.");
  }
});

function resetUI() {
  currentCard.hidden = true;
  forecastCard.hidden = true;
  dailyList.innerHTML = "";
  currentSummaryEl.textContent = "";
  placeEl.textContent = "";
}

function setStatus(msg) { statusEl.textContent = msg; }
function clearStatus() { statusEl.textContent = ""; }

// Geocoding (city → lat/lon) via Open-Meteo
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

function renderCurrent(loc, data) {
  placeEl.textContent = `${loc.name}, ${loc.admin1 ?? ""} ${loc.country}`.replace(/\s+/g, " ").trim();
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
