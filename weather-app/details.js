const params = new URLSearchParams(location.search);
const lat = parseFloat(params.get('lat'));
const lon = parseFloat(params.get('lon'));
const place = params.get('place') || 'Location';

const titleEl = document.getElementById('title');
const dailyTable = document.getElementById('daily-table');
const hourlyTable = document.getElementById('hourly-table');
const toggleBtn = document.getElementById('unit-toggle');

let unit = 'C';
let weatherData = null;

titleEl.textContent = `Weather details for ${place}`;

function formatTemp(c) {
  return unit === 'C' ? `${Math.round(c)}°C` : `${Math.round(c * 9 / 5 + 32)}°F`;
}

function dirText(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function renderDaily() {
  const d = weatherData.daily;
  let html = '<tr><th>Date</th><th>Min</th><th>Max</th><th>Rain (mm)</th><th>Wind (km/h)</th><th>Dir</th></tr>';
  for (let i = 0; i < d.time.length; i++) {
    html += `<tr><td>${d.time[i]}</td><td>${formatTemp(d.temperature_2m_min[i])}</td><td>${formatTemp(d.temperature_2m_max[i])}</td><td>${Math.round(d.precipitation_sum[i] * 10) / 10}</td><td>${Math.round(d.windspeed_10m_max[i])}</td><td>${dirText(d.winddirection_10m_dominant[i])}</td></tr>`;
  }
  dailyTable.innerHTML = html;
}

function renderHourly() {
  const h = weatherData.hourly;
  let html = '<tr><th>Time</th><th>Temp</th><th>Rain (mm)</th><th>Wind (km/h)</th><th>Dir</th></tr>';
  const now = Date.now();
  let start = 0;
  while (start < h.time.length && new Date(h.time[start]).getTime() < now) start++;
  for (let i = start; i < start + 24 && i < h.time.length; i++) {
    html += `<tr><td>${h.time[i]}</td><td>${formatTemp(h.temperature_2m[i])}</td><td>${Math.round(h.precipitation[i] * 10) / 10}</td><td>${Math.round(h.windspeed_10m[i])}</td><td>${dirText(h.winddirection_10m[i])}</td></tr>`;
  }
  hourlyTable.innerHTML = html;
}

function render() {
  renderDaily();
  renderHourly();
  toggleBtn.textContent = unit === 'C' ? 'Show °F' : 'Show °C';
}

toggleBtn.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  render();
});

async function fetchDetails() {
  const qs = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant',
    hourly: 'temperature_2m,precipitation,windspeed_10m,winddirection_10m',
    forecast_days: '5'
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`);
  weatherData = await res.json();
  render();
}

fetchDetails();
