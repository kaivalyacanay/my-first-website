const params = new URLSearchParams(location.search);
const lat = parseFloat(params.get('lat'));
const lon = parseFloat(params.get('lon'));
const place = params.get('place') || 'Location';

const titleEl = document.getElementById('title');
const dailyCanvas = document.getElementById('daily-chart');
const hourlyCanvas = document.getElementById('hourly-chart');
const toggleBtn = document.getElementById('unit-toggle');

let unit = 'C';
let weatherData = null;
let dailyChart = null;
let hourlyChart = null;

titleEl.textContent = `Weather details for ${place}`;


function renderDaily() {
  const d = weatherData.daily;
  const labels = d.time;
  const maxTemps = d.temperature_2m_max.map(t => unit === 'C' ? t : t * 9 / 5 + 32);
  const minTemps = d.temperature_2m_min.map(t => unit === 'C' ? t : t * 9 / 5 + 32);
  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(dailyCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Max Temp (°${unit})`,
          data: maxTemps,
          borderColor: 'red',
          tension: 0.1
        },
        {
          label: `Min Temp (°${unit})`,
          data: minTemps,
          borderColor: 'blue',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderHourly() {
  const h = weatherData.hourly;
  const now = Date.now();
  let start = 0;
  while (start < h.time.length && new Date(h.time[start]).getTime() < now) start++;
  const labels = [];
  const temps = [];
  for (let i = start; i < start + 24 && i < h.time.length; i++) {
    labels.push(h.time[i].split('T')[1]);
    const t = h.temperature_2m[i];
    temps.push(unit === 'C' ? t : t * 9 / 5 + 32);
  }
  if (hourlyChart) hourlyChart.destroy();
  hourlyChart = new Chart(hourlyCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Temp (°${unit})`,
          data: temps,
          borderColor: 'orange',
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
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
