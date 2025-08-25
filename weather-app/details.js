const params = new URLSearchParams(location.search);
const lat = parseFloat(params.get('lat'));
const lon = parseFloat(params.get('lon'));
const place = params.get('place') || 'Location';

const titleEl = document.getElementById('title');
const dailyWidget = document.getElementById('daily-widget');
const hourlyImg = document.getElementById('hourly-chart');
const toggleBtn = document.getElementById('unit-toggle');

let unit = 'C';
let weatherData = null;

titleEl.textContent = `Weather details for ${place}`;

function setupWidget() {
  const latAbs = Math.abs(lat).toFixed(2).split('.');
  const lonAbs = Math.abs(lon).toFixed(2).split('.');
  const latDir = lat >= 0 ? 'n' : 's';
  const lonDir = lon >= 0 ? 'e' : 'w';
  const locPath = `${latAbs[0]}d${latAbs[1]}${latDir}${lonAbs[0]}d${lonAbs[1]}${lonDir}`;
  const slug = place
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  dailyWidget.href = `https://forecast7.com/en/${locPath}/${slug}/`;
  dailyWidget.textContent = `${place} Weather`;
  dailyWidget.setAttribute('data-label_1', place);
  dailyWidget.setAttribute('data-label_2', 'WEATHER');
  dailyWidget.setAttribute('data-days', '5');
  dailyWidget.setAttribute('data-theme', 'pure');
  if (window.__weatherwidget_init) window.__weatherwidget_init();
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
  const config = {
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
    }
  };
  const url = 'https://quickchart.io/chart?width=600&height=300&c=' + encodeURIComponent(JSON.stringify(config));
  hourlyImg.src = url;
}

function render() {
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
    hourly: 'temperature_2m,precipitation,windspeed_10m,winddirection_10m',
    forecast_days: '5'
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs.toString()}`);
  weatherData = await res.json();
  render();
}

setupWidget();
fetchDetails();
